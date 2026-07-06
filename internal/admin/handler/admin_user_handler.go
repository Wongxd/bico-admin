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
		exists, err := crud.Exists(db, &model.AdminUser{}, "username = ?", req.Username)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, errors.New("用户名已存在")
		}

		hashed, err := password.Hash(req.Password)
		if err != nil {
			return nil, err
		}

		return &model.AdminUser{
			Username: req.Username,
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
		updates := map[string]interface{}{}
		if req.Username != "" && req.Username != existing.Username {
			exists, err := crud.Exists(db, &model.AdminUser{}, "username = ? AND id != ?", req.Username, existing.ID)
			if err != nil {
				return nil, err
			}
			// 用户名需要保持全局唯一，否则登录入口无法确定用户身份。
			if exists {
				return nil, errors.New("用户名已存在")
			}
			updates["username"] = req.Username
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
		}
		if req.Enabled != nil {
			updates["enabled"] = *req.Enabled
		}
		return updates, nil
	}
	h.BeforeUpdate = func(tx *gorm.DB, id uint, existing *model.AdminUser, req *updateUserReq, updates map[string]interface{}) error {
		// 超级管理员承担系统兜底入口，不能被禁用，否则可能导致系统无可用管理账号。
		if existing.IsSuperAdmin && req.Enabled != nil && !*req.Enabled {
			return errors.New("内置超级管理员不能禁用")
		}
		return nil
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
	h.ReloadAfterUpdate = func(tx *gorm.DB, id uint, existing *model.AdminUser) error {
		return tx.Preload("Roles").First(existing, id).Error
	}

	h.BeforeDelete = func(tx *gorm.DB, id uint) error {
		return ensureAdminUsersDeletable(tx, []uint{id})
	}
	h.BeforeDeleteBatch = func(tx *gorm.DB, ids []uint) error {
		return ensureAdminUsersDeletable(tx, ids)
	}
	h.DeleteInTx = func(tx *gorm.DB, id uint) error {
		var user model.AdminUser
		if err := tx.First(&user, id).Error; err != nil {
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
		// 删除用户后权限和启用状态缓存都不再有效，需要逐个失效。
		if h.cacheInvalidator != nil {
			for _, id := range ids {
				h.cacheInvalidator.InvalidateUserPermissionCache(id)
				h.cacheInvalidator.InvalidateUserStatusCache(id)
			}
		}
		return nil
	}

	return h
}

// ensureAdminUsersDeletable 校验待删除用户是否允许删除，内置超级管理员承担系统兜底权限，不能被删除。
func ensureAdminUsersDeletable(tx *gorm.DB, ids []uint) error {
	var count int64
	if err := tx.Model(&model.AdminUser{}).
		Where("id IN ? AND is_super_admin = ?", ids, true).
		Count(&count).Error; err != nil {
		return err
	}
	// 命中内置超级管理员时直接拒绝，避免系统失去默认兜底账号。
	if count > 0 {
		return errors.New("内置超级管理员不能删除")
	}
	return nil
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
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
		Name     string `json:"name"`
		Avatar   string `json:"avatar"`
		Enabled  *bool  `json:"enabled"`
		RoleIDs  []uint `json:"role_ids"`
	}
	updateUserReq struct {
		Username string `json:"username"`
		Name     string `json:"name"`
		Avatar   string `json:"avatar"`
		Enabled  *bool  `json:"enabled"`
		RoleIDs  []uint `json:"role_ids"`
		Password string `json:"password"`
	}
)

func (h *AdminUserHandler) syncRoles(tx *gorm.DB, user *model.AdminUser, roleIDs []uint) error {
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

var _ crud.Module = (*AdminUserHandler)(nil)
