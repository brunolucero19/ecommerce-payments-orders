package rabbit

import (
	"time"

	"github.com/nmarsollier/commongo/log"
	"github.com/nmarsollier/commongo/rbt"
	"github.com/nmarsollier/ordersgo/internal/di"
	"github.com/nmarsollier/ordersgo/internal/env"
)

//	@Summary		Mensage Rabbit logout
//	@Description	Escucha de mensajes logout desde auth.
//	@Tags			Rabbit
//	@Accept			json
//	@Produce		json
//	@Param			body	body	rbt.InputMessage[string]	true	"Estructura general del mensage"
//	@Router			/rabbit/logout [get]
//
// Escucha de mensajes logout desde auth.
func listenLogout(logger log.LogRusEntry) {
	for {
		err := rbt.ConsumeRabbitEvent[string](
			env.Get().FluentURL,
			env.Get().RabbitURL,
			env.Get().ServerName,
			"auth",
			"fanout",
			"",
			"",
			processLogout,
		)

		if err != nil {
			logger.Error(err)
		}
		logger.Info("RabbitMQ listenLogout conectando en 5 segundos.")
		time.Sleep(5 * time.Second)
	}
}

func processLogout(logger log.LogRusEntry, newMessage *rbt.InputMessage[string]) {
	deps := di.NewInjector(logger)

	deps.SecurityService().Invalidate(newMessage.Message)
}
