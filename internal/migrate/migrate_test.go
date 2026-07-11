package migrate

import (
	"strings"
	"testing"

	adminModel "bico-admin/internal/admin/model"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

// TestAutoMigrateRequiresProductionAdminPassword 验证生产首迁移不存在默认密码。
func TestAutoMigrateRequiresProductionAdminPassword(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		// 数据库不可用时无法验证初始化事务。
		t.Fatalf("创建测试数据库失败: %v", err)
	}
	t.Setenv("BICO_ADMIN_INITIAL_PASSWORD", "")

	err = AutoMigrate(database, "release")
	if err == nil || !strings.Contains(err.Error(), "BICO_ADMIN_INITIAL_PASSWORD") {
		// 空密码必须阻断首个生产账号创建。
		t.Fatalf("期望初始密码校验失败，实际错误: %v", err)
	}
}

// TestAutoMigrateRejectsShortProductionPassword 验证生产初始密码遵守八位下限。
func TestAutoMigrateRejectsShortProductionPassword(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		// 数据库不可用时无法验证密码规则。
		t.Fatalf("创建测试数据库失败: %v", err)
	}
	t.Setenv("BICO_ADMIN_INITIAL_PASSWORD", "1234567")

	err = AutoMigrate(database, "release")
	if err == nil || !strings.Contains(err.Error(), "8 位") {
		// 七位密码必须在账号创建前被拒绝。
		t.Fatalf("期望短密码校验失败，实际错误: %v", err)
	}
}

// TestAutoMigrateAssignsSuperAdminRole 验证首个管理员通过保留角色获得权限。
func TestAutoMigrateAssignsSuperAdminRole(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		// 数据库不可用时无法验证角色关系。
		t.Fatalf("创建测试数据库失败: %v", err)
	}
	t.Setenv("BICO_ADMIN_INITIAL_PASSWORD", "strong-admin-password")

	if err := AutoMigrate(database, "release"); err != nil {
		// 合法初始密码应完成全部迁移。
		t.Fatalf("执行迁移失败: %v", err)
	}

	var relationCount int64
	if err := database.Table("admin_user_roles").
		Joins("JOIN admin_roles ON admin_user_roles.role_id = admin_roles.id").
		Joins("JOIN admin_users ON admin_user_roles.user_id = admin_users.id").
		Where("admin_users.username = ? AND admin_roles.code = ?", "admin", adminModel.SuperAdminRoleCode).
		Count(&relationCount).Error; err != nil {
		// 关联查询失败说明迁移结构不完整。
		t.Fatalf("查询超级管理员关联失败: %v", err)
	}
	if relationCount != 1 {
		// 首个管理员必须且只能关联一次保留角色。
		t.Fatalf("超级管理员关联数量错误: %d", relationCount)
	}
}
