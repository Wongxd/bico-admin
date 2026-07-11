package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// CORS 跨域中间件
// 仅回显配置白名单中的来源；同源请求无需 CORS 响应头。
func CORS(allowedOrigins []string) gin.HandlerFunc {
	allowed := make(map[string]struct{}, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		allowed[origin] = struct{}{}
	}

	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin == "" {
			// 非跨域请求不需要附加 CORS 响应头。
			c.Next()
			return
		}

		if _, ok := allowed[origin]; !ok {
			// 预检请求必须明确拒绝，普通请求则不返回跨域授权头。
			if c.Request.Method == http.MethodOptions {
				c.AbortWithStatus(http.StatusForbidden)
				return
			}
			c.Next()
			return
		}

		c.Writer.Header().Add("Vary", "Origin")
		c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")
		c.Writer.Header().Set("Access-Control-Expose-Headers", "Content-Length, Access-Control-Allow-Origin, Access-Control-Allow-Headers, Content-Type")

		// 处理 OPTIONS 预检请求
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
