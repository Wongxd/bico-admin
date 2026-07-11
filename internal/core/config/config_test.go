package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestLoadConfigRejectsWeakReleaseSecret 验证生产模式拒绝示例密钥。
func TestLoadConfigRejectsWeakReleaseSecret(t *testing.T) {
	configPath := writeTestConfig(t, "release", "short-secret")

	_, err := LoadConfig(configPath)
	if err == nil || !strings.Contains(err.Error(), "JWT 密钥") {
		// 未拒绝弱密钥会让示例配置直接进入生产。
		t.Fatalf("期望弱密钥校验失败，实际错误: %v", err)
	}
}

// TestLoadConfigReadsJWTSecretFromEnvironment 验证生产密钥可由环境变量安全注入。
func TestLoadConfigReadsJWTSecretFromEnvironment(t *testing.T) {
	configPath := writeTestConfig(t, "release", "")
	secret := "0123456789abcdef0123456789abcdef"
	t.Setenv("BICO_JWT_SECRET", secret)

	cfg, err := LoadConfig(configPath)
	if err != nil {
		// 合法环境变量应覆盖空配置并通过校验。
		t.Fatalf("加载配置失败: %v", err)
	}
	if cfg.JWT.Secret != secret {
		// 密钥未覆盖说明生产仍会读取文件中的敏感值。
		t.Fatalf("环境变量未生效")
	}
}

// writeTestConfig 写入满足基础字段要求的最小测试配置。
func writeTestConfig(t *testing.T, mode string, secret string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "config.yaml")
	content := "server:\n  mode: " + mode + "\njwt:\n  secret: \"" + secret + "\"\n  expire_hours: 1\n"
	if err := os.WriteFile(path, []byte(content), 0600); err != nil {
		// 测试配置无法创建时继续执行没有判断价值。
		t.Fatalf("写入测试配置失败: %v", err)
	}
	return path
}
