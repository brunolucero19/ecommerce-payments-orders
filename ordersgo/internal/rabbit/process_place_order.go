package rabbit

import (
	"time"

	"github.com/nmarsollier/commongo/log"
	"github.com/nmarsollier/commongo/rbt"
	"github.com/nmarsollier/ordersgo/internal/di"
	"github.com/nmarsollier/ordersgo/internal/env"
	"github.com/nmarsollier/ordersgo/internal/events"
)

//	@Summary		Mensage Rabbit place_order/order_place_order
//	@Description	Cuando se consume place_order se genera la orden y se inicia el proceso.
//	@Tags			Rabbit
//	@Accept			json
//	@Produce		json
//	@Param			place_order	body	rbt.InputMessage[events.PlacedOrderData]	true	"Consume place_order/order_place_order"
//	@Router			/rabbit/place_order [get]
//
// Validar Artículos
func listenPlaceOrder(logger log.LogRusEntry) {
	for {
		err := rbt.ConsumeRabbitEvent[events.PlacedOrderData](
			env.Get().FluentURL,
			env.Get().RabbitURL,
			env.Get().ServerName,
			"place_order",
			"direct",
			"order_place_order",
			"place_order",
			processPlaceOrder,
		)

		if err != nil {
			logger.Error(err)
		}
		logger.Info("RabbitMQ listenLogout conectando en 5 segundos.")
		time.Sleep(5 * time.Second)
	}
}

func processPlaceOrder(logger log.LogRusEntry, newMessage *rbt.InputMessage[events.PlacedOrderData]) {
	deps := di.NewInjector(logger)

	_, err := deps.Service().PocessPlaceOrder(&newMessage.Message)
	if err != nil {
		deps.Logger().Error(err)
		return
	}
}
