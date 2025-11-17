package main

import (
	"github.com/nmarsollier/commongo/log"
	"github.com/nmarsollier/ordersgo/internal/di"
	"github.com/nmarsollier/ordersgo/internal/env"
	server "github.com/nmarsollier/ordersgo/internal/graph"
	"github.com/nmarsollier/ordersgo/internal/rabbit"
	"github.com/nmarsollier/ordersgo/internal/rest"
)

//	@title			OrdersGo
//	@version		1.0
//	@description	Microservicio de Ordenes.
//	@contact.name	Nestor Marsollier
//	@contact.email	nmarsollier@gmail.com
//
//	@host			localhost:3004
//	@BasePath		/v1
//
// Main Method
func main() {
	dedps := di.NewInjector(log.Get(env.Get().FluentURL, env.Get().ServerName))

	go rabbit.Init(dedps)
	go server.Start()
	rest.Start()
}
