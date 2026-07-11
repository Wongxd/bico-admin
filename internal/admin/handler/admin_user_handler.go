package handler

import (
	"bico-admin/internal/admin/model"
	"bico-admin/internal/admin/service"
	"bico-admin/internal/pkg/crud"
	"bico-admin/internal/pkg/password"
	"errors"
	"strconv"
	"strings"

	"gorm.io/gorm"
)

// 权限定义
var userPerms = crud.NewCRUDPerms("system", "admin_user", "用户管理")

// AdminUserHandler 用户管理处理器
type AdminUserHandler struct {
	crud.CRUDHandler[model.AdminUser, userListReq, createUserReq, updateUserReq]
	cacheInvalidator service.AuthCacheInvalidator
}

func NewAdminUserHandler(db *gorm.DB, cacheInvalidator service.AuthCacheInvalidator) *AdminUserHandler {
	h := &AdminUserHandler{cacheInvalidator: cacheInvalidator}
	h.DB = db
	h.NotFoundMsg = "用户不存在"

	h.BuildListQuery = func(db *gorm.DB, req *userListReq) *gorm.DB {
		query := db.Model(&model.AdminUser{}).Preload("Roles")
		if req.Username != "" {
			query = query.Where("username LIKE ?", "%"+req.Username+"%")
		}
		if req.Name != "" {
			query = query.Where("name LIKE ?", "%"+req.Name+"%")
		}
		if req.Enabled != nil {
			query = query.Where("enabled = ?", *req.Enabled)
		}
		roleIDs := parseUserRoleIDs(req.RoleIDs)
		if len(roleIDs) > 0 {
			// 角色筛选走关联表 EXISTS，避免 JOIN 影响用户列表分页总数。
			query = query.Where(
				"EXISTS (SELECT 1 FROM admin_user_roles WHERE admin_user_roles.user_id = admin_users.id AND admin_user_roles.role_id IN ?)",
				roleIDs,
			)
		}
		return query
	}

	h.BuildGetQuery = func(db *gorm.DB) *gorm.DB {
		return db.Model(&model.AdminUser{}).Preload("Roles")
	}

	h.NewModelFromCreate = func(req *createUserReq) (*model.AdminUser, error) {
		username := strings.TrimSpace(req.Username)
		if username == "" {
			// 去除首尾空格后为空的用户名不能用于登录。
			return nil, service.ErrUsernameRequired
		}
		exists, err := crud.Exists(db, &model.AdminUser{}, "username = ?", username)
		if err != nil {
			return nil, err
		}
		if exists {
			// 用户名是全局唯一的登录标识。
			return nil, service.ErrUsernameExists
		}

		hashed, err := password.Hash(req.Password)
		if err != nil {
			return nil, err
		}

		return &model.AdminUser{
			Username: username,
			Password: hashed,
			Name:     req.Name,
			Avatar:   req.Avatar,
			Enabled:  req.Enabled == nil || *req.Enabled,
		}, nil
	}

	h.CreateInTx = func(tx *gorm.DB, item *model.AdminUser, req *createUserReq) error {
		return h.syncRoles(tx, item, req.RoleIDs)
	}
	// 需要返回带 Roles 的用户数据
	h.ReloadAfterCreate = func(tx *gorm.DB, id uint, item *model.AdminUser) error {
		return tx.Preload("Roles").First(item, item.ID).Error
	}

	h.BuildUpdateQuery = func(tx *gorm.DB) *gorm.DB {
		return tx.Model(&model.AdminUser{})
	}
	h.BuildUpdates = func(req *updateUserReq, existing *model.AdminUser) (map[string]interface{}, error) {
		if req.Enabled != nil && !*req.Enabled {
			// 至少保留一个启用的超级管理员，避免后台永久失去管理入口。
			if err := h.ensureSuperAdminRemains(db, existing.ID); err != nil {
				return nil, err
			}
		}
		updates := map[string]interface{}{}
		if req.Username != nil {
			username := strings.TrimSpace(*req.Username)
			if username == "" {
				// 显式提交空用户名时拒绝保存。
				return nil, service.ErrUsernameRequired
			}
			if username != existing.Username {
				// 查重时排除当前用户，允许保存未变更的用户名。
				exists, err := crud.Exists(db, &model.AdminUser{}, "username = ? AND id <> ?", username, existing.ID)
				if err != nil {
					// 查重失败时不执行后续更新。
					return nil, err
				}
				if exists {
					// 重复用户名会导致登录身份不唯一。
					return nil, service.ErrUsernameExists
				}
				updates["username"] = username
			}
		}
		if req.Name != "" {
			updates["name"] = req.Name
		}
		if req.Avatar != "" {
			updates["avatar"] = req.Avatar
		}
		if req.Password != "" {
			hashed, err := password.Hash(req.Password)
			if err != nil {
				return nil, err
			}
			updates["password"] = hashed
			updates["token_version"] = gorm.Expr("token_version + 1")
		}
		if req.Enabled != nil {
			updates["enabled"] = *req.Enabled
		}
		return updates, nil
	}
	h.UpdateInTx = func(tx *gorm.DB, id uint, existing *model.AdminUser, req *updateUserReq) error {
		// 角色发生变更时同步角色关联并失效权限缓存。
		if req.RoleIDs == nil {
			// 仅更新启用状态时失效状态缓存。
			if req.Enabled != nil && h.cacheInvalidator != nil {
				h.cacheInvalidator.InvalidateUserStatusCache(existing.ID)
			}
			return nil
		}
		if err := h.syncRoles(tx, existing, req.RoleIDs); err != nil {
			return err
		}
		if h.cacheInvalidator != nil {
			h.cacheInvalidator.InvalidateUserPermissionCache(existing.ID)
			// 角色更新请求可能同时包含 enabled，统一失效状态缓存。
			h.cacheInvalidator.InvalidateUserStatusCache(existing.ID)
		}
		return nil
	}
	h.AfterUpdateCommit = func(id uint, existing *model.AdminUser, req *updateUserReq) {
		if req.Password != "" && h.cacheInvalidator != nil {
			// 提交后清缓存，防止并发请求在提交前回填旧令牌版本。
			h.cacheInvalidator.InvalidateUserTokenVersionCache(existing.ID)
		}
	}
	h.ReloadAfterUpdate = func(tx *gorm.DB, id uint, existing *model.AdminUser) error {
		return tx.Preload("Roles").First(existing, id).Error
	}

	h.BeforeDeleteBatch = func(tx *gorm.DB, ids []uint) error {
		return h.ensureSuperAdminsRemain(tx, ids)
	}
	h.DeleteInTx = func(tx *gorm.DB, id uint) error {
		var user model.AdminUser
		if err := tx.First(&user, id).Error; err != nil {
			return err
		}
		if err := h.ensureSuperAdminRemains(tx, user.ID); err != nil {
			return err
		}
		// 删除用户前先清空角色关联，任一步失败都回滚。
		if err := tx.Model(&user).Association("Roles").Clear(); err != nil {
			return err
		}
		if h.cacheInvalidator != nil {
			h.cacheInvalidator.InvalidateUserPermissionCache(user.ID)
			h.cacheInvalidator.InvalidateUserStatusCache(user.ID)
		}
		return nil
	}
	h.DeleteBatchInTx = func(tx *gorm.DB, ids []uint) error {
		// 批量删除前先清理用户角色关联，后续主记录删除失败时会随事务回滚。
		if err := tx.Where("user_id IN ?", ids).Delete(&model.AdminUserRole{}).Error; err != nil {
			return err
		}
		// 删除用户后批量失效权限与状态缓存。
		if h.cacheInvalidator != nil {
			h.cacheInvalidator.InvalidateUsersAuthCache(ids)
		}
		return nil
	}

	return h
}

// parseUserRoleIDs 解析用户列表角色筛选参数，忽略非法片段以保持筛选接口容错。
func parseUserRoleIDs(value string) []uint {
	if value == "" {
		return nil
	}

	parts := strings.Split(value, ",")
	ids := make([]uint, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		// 空片段来自多余逗号，不参与筛选。
		if trimmed == "" {
			continue
		}
		id, err := strconv.ParseUint(trimmed, 10, 64)
		// 非法角色 ID 直接忽略，避免一个脏值导致整个列表不可用。
		if err != nil || id == 0 {
			continue
		}
		ids = append(ids, uint(id))
	}
	return crud.UniqueUints(ids)
}

func (h *AdminUserHandler) ModuleConfig() crud.ModuleConfig {
	return crud.ModuleConfig{
		Name:             "admin_user",
		Group:            "/admin-users",
		Description:      "用户管理",
		ParentPermission: PermSystemManage,
		Permissions:      userPerms.Tree,
		Routes:           userPerms.Routes(),
		Swagger: crud.SwaggerConfig{
			Model:         model.AdminUser{},
			ListRequest:   userListReq{},
			CreateRequest: createUserReq{},
			UpdateRequest: updateUserReq{},
		},
	}
}

// 请求结构
type (
	userListReq struct {
		Username string `form:"username"`
		Name     string `form:"name"`
		Enabled  *bool  `form:"enabled"`
		RoleIDs  string `form:"role_ids"`
	}
	createUserReq struct {
		Username string `json:"username" binding:"required,max=64"`
		Password string `json:"password" binding:"required,min=8"`
		Name     string `json:"name"`
		Avatar   string `json:"avatar"`
		Enabled  *bool  `json:"enabled"`
		RoleIDs  []uint `json:"role_ids"`
	}
	updateUserReq struct {
		Username *string `json:"username" binding:"omitempty,max=64"`
		Name     string  `json:"name"`
		Avatar   string  `json:"avatar"`
		Enabled  *bool   `json:"enabled"`
		RoleIDs  []uint  `json:"role_ids"`
		Password string  `json:"password" binding:"omitempty,min=8"`
	}
)

func (h *AdminUserHandler) syncRoles(tx *gorm.DB, user *model.AdminUser, roleIDs []uint) error {
	if err := h.ensureRoleChangeKeepsSuperAdmin(tx, user.ID, roleIDs); err != nil {
		return err
	}
	// 先清空旧关联，确保写入结果与请求保持一致。
	if err := tx.Model(user).Association("Roles").Clear(); err != nil {
		return err
	}
	if len(roleIDs) == 0 {
		return nil
	}

	uniqueRoleIDs := crud.UniqueUints(roleIDs)
	var roles []*model.AdminRole
	if err := tx.Where("id IN ?", uniqueRoleIDs).Find(&roles).Error; err != nil {
		return err
	}
	// 如果查询数量不一致，说明请求中存在无效角色 ID。
	if len(roles) != len(uniqueRoleIDs) {
		return errors.New("存在无效角色 ID")
	}
	if err := tx.Model(user).Association("Roles").Append(roles); err != nil {
		return err
	}
	return nil
}

// ensureRoleChangeKeepsSuperAdmin 校验角色调整不会移除最后一个超级管理员。
func (h *AdminUserHandler) ensureRoleChangeKeepsSuperAdmin(db *gorm.DB, userID uint, roleIDs []uint) error {
	var currentSuperCount int64
	if err := db.Table("admin_user_roles").
		Joins("JOIN admin_roles ON admin_user_roles.role_id = admin_roles.id").
		Where("admin_user_roles.user_id = ? AND admin_roles.code = ?", userID, model.SuperAdminRoleCode).
		Count(&currentSuperCount).Error; err != nil {
		return err
	}
	if currentSuperCount == 0 {
		// 普通用户的角色调整不影响超级管理员连续性。
		return nil
	}

	var requestedSuperCount int64
	if len(roleIDs) > 0 {
		if err := db.Model(&model.AdminRole{}).
			Where("id IN ? AND code = ?", crud.UniqueUints(roleIDs), model.SuperAdminRoleCode).
			Count(&requestedSuperCount).Error; err != nil {
			return err
		}
	}
	if requestedSuperCount > 0 {
		// 请求仍保留超级管理员角色，无需额外校验。
		return nil
	}
	return h.ensureSuperAdminRemains(db, userID)
}

// ensureSuperAdminRemains 确保目标用户之外仍有启用的超级管理员。
func (h *AdminUserHandler) ensureSuperAdminRemains(db *gorm.DB, userID uint) error {
	return h.ensureSuperAdminsRemain(db, []uint{userID})
}

// ensureSuperAdminsRemain 确保排除目标用户后仍有启用的超级管理员。
func (h *AdminUserHandler) ensureSuperAdminsRemain(db *gorm.DB, excludedUserIDs []uint) error {
	var targetSuperCount int64
	if err := db.Table("admin_user_roles").
		Joins("JOIN admin_roles ON admin_user_roles.role_id = admin_roles.id").
		Where("admin_user_roles.user_id IN ? AND admin_roles.code = ?", excludedUserIDs, model.SuperAdminRoleCode).
		Count(&targetSuperCount).Error; err != nil {
		return err
	}
	if targetSuperCount == 0 {
		// 目标不是超级管理员时可直接变更。
		return nil
	}

	var remaining int64
	if err := db.Table("admin_user_roles").
		Joins("JOIN admin_roles ON admin_user_roles.role_id = admin_roles.id").
		Joins("JOIN admin_users ON admin_user_roles.user_id = admin_users.id").
		Where("admin_roles.code = ? AND admin_roles.enabled = ? AND admin_users.enabled = ? AND admin_users.id NOT IN ?", model.SuperAdminRoleCode, true, true, excludedUserIDs).
		Count(&remaining).Error; err != nil {
		return err
	}
	if remaining == 0 {
		return errors.New("必须保留至少一个启用的超级管理员")
	}
	return nil
}

var _ crud.Module = (*AdminUserHandler)(nil)
