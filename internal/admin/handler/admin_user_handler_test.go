package handler

import (
	"errors"
	"testing"

	"bico-admin/internal/admin/model"
	"bico-admin/internal/admin/service"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

// TestAdminUserUsernameUpdate 验证用户管理可修改用户名且不允许重复。
func TestAdminUserUsernameUpdate(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		// 数据库不可用时无法验证用户名查重。
		t.Fatalf("创建测试数据库失败: %v", err)
	}
	if err := database.AutoMigrate(&model.AdminUser{}); err != nil {
		// 用户表未建立时无法测试更新逻辑。
		t.Fatalf("迁移测试数据库失败: %v", err)
	}

	users := []model.AdminUser{
		{Username: "first-user", Password: "unused", Enabled: true},
		{Username: "existing-user", Password: "unused", Enabled: true},
	}
	if err := database.Create(&users).Error; err != nil {
		// 测试数据缺失时无法区分自身与重复用户名。
		t.Fatalf("创建测试用户失败: %v", err)
	}

	handler := NewAdminUserHandler(database, nil)
	newUsername := "  renamed-user  "
	updates, err := handler.BuildUpdates(&updateUserReq{Username: &newUsername}, &users[0])
	if err != nil {
		// 未被占用的用户名应允许更新。
		t.Fatalf("生成用户更新数据失败: %v", err)
	}
	if updates["username"] != "renamed-user" {
		// 持久化前应统一去除用户名首尾空格。
		t.Fatalf("用户名未正确标准化: %v", updates["username"])
	}

	duplicateUsername := users[1].Username
	_, err = handler.BuildUpdates(&updateUserReq{Username: &duplicateUsername}, &users[0])
	if !errors.Is(err, service.ErrUsernameExists) {
		// 被其他用户占用的用户名必须被拒绝。
		t.Fatalf("期望用户名已存在错误，实际为: %v", err)
	}
}
