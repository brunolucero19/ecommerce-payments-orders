package rabbit

import (
	"time"

	"github.com/nmarsollier/commongo/log"
	"github.com/nmarsollier/commongo/rbt"
	"github.com/nmarsollier/ordersgo/internal/env"
)

// OrderCanceledMessage estructura del evento order.canceled
type OrderCanceledMessage struct {
	OrderID    string `json:"orderId"`
	UserID     string `json:"userId"`
	CanceledAt string `json:"canceledAt"`
	Reason     string `json:"reason,omitempty"`
}

// PublishOrderCanceled publica un evento de orden cancelada al exchange order_events
func PublishOrderCanceled(logger log.LogRusEntry, orderId, userId, reason string) error {
	message := &OrderCanceledMessage{
		OrderID:    orderId,
		UserID:     userId,
		CanceledAt: time.Now().Format(time.RFC3339),
		Reason:     reason,
	}

	logger.WithField("orderId", orderId).
		WithField("userId", userId).
		WithField("reason", reason).
		Info("Publishing order.canceled event")

	// Crear publisher para payments_exchange (usando exchange existente)
	publisher, err := rbt.NewRabbitPublisher[*OrderCanceledMessage](
		rbt.RbtLogger(env.Get().FluentURL, env.Get().ServerName, logger.CorrelationId()),
		env.Get().RabbitURL,
		"payments_exchange",
		"topic",
		"order.canceled",
	)

	if err != nil {
		logger.Error("Error creating publisher: ", err)
		return err
	}

	// Publicar mensaje
	publisher.Publish(message)

	logger.Info("order.canceled event published successfully")
	return nil
}
