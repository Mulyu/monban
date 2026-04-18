module example.com/foo

go 1.22

require (
	github.com/spf13/cobra v1.8.0
	github.com/stretchr/testify v1.9.0
)

require github.com/foo/bar v0.1.0 // indirect
