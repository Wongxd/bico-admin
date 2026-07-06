//go:build !stub

package web

import "embed"

//go:embed dist/*
var DistFS embed.FS
