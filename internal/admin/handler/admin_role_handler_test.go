package handler

import (
	"strings"
	"testing"
)

// TestGenerateRoleCode 验证内部角色标识格式稳定且不会复用。
func TestGenerateRoleCode(t *testing.T) {
	first, err := generateRoleCode()
	if err != nil {
		// 随机标识生成失败时无法验证格式。
		t.Fatalf("生成首个角色标识失败: %v", err)
	}
	second, err := generateRoleCode()
	if err != nil {
		// 第二次生成失败时无法验证重复风险。
		t.Fatalf("生成第二个角色标识失败: %v", err)
	}
	if !strings.HasPrefix(first, "role_") || len(first) != 21 {
		// 固定前缀便于运维识别，随机部分保持十六位。
		t.Fatalf("角色标识格式错误: %s", first)
	}
	if first == second {
		// 两次独立生成不应得到相同标识。
		t.Fatalf("角色标识发生重复: %s", first)
	}
}
