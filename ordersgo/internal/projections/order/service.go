package order

import (
	"github.com/nmarsollier/commongo/log"
	"github.com/nmarsollier/ordersgo/internal/events"
)

type OrderService interface {
	Update(orderId string, ev []*events.Event) (*Order, error)
	FindByOrderId(orderId string) (*Order, error)
	FindByUserId(userId string) ([]*Order, error)
}

func NewOrderService(log log.LogRusEntry, repository OrderRepository) OrderService {
	return &orderService{
		log:        log,
		repository: repository,
	}
}

type orderService struct {
	log        log.LogRusEntry
	repository OrderRepository
}

func (s *orderService) Update(orderId string, ev []*events.Event) (*Order, error) {
	order, _ := s.repository.FindByOrderId(orderId)
	if order == nil {
		order = &Order{
			OrderId: orderId,
		}
	}

	for _, e := range ev {
		order = s.update(order, e)
	}

	if _, err := s.repository.Insert(order); err != nil {
		return nil, err
	}

	return order, nil
}

func (s *orderService) update(order *Order, event *events.Event) *Order {
	switch event.Type {
	case events.Place:
		order = s.updatePlace(order, event)
	case events.Validation:
		order = s.updateValidation(order, event)
	case events.Payment:
		order = s.updatePayment(order, event)
	case events.Cancel:
		order = s.updateCancel(order, event)
	}
	return order
}

func (s *orderService) updatePlace(o *Order, e *events.Event) *Order {
	o.OrderId = e.OrderId
	o.UserId = e.PlaceEvent.UserId
	o.CartId = e.PlaceEvent.CartId
	o.Status = Placed
	o.Created = e.Created
	o.Updated = e.Updated

	articles := make([]*Article, len(e.PlaceEvent.Articles))
	for i, article := range e.PlaceEvent.Articles {
		articles[i] = &Article{
			ArticleId: article.ArticleId,
			Quantity:  article.Quantity,
		}
	}

	o.Articles = articles
	return o
}

func (s *orderService) updateValidation(o *Order, e *events.Event) *Order {
	validation := e.Validation

	for _, a := range o.Articles {
		if a.ArticleId == validation.ArticleId {
			a.IsValid = validation.IsValid
			a.UnitaryPrice = validation.Price
			a.IsValidated = true
		}
	}

	o.Status = Validated
	for _, a := range o.Articles {
		if !a.IsValid {
			o.Status = Invalid
		}
	}

	o.Updated = e.Updated

	return o
}

func (s *orderService) updatePayment(o *Order, e *events.Event) *Order {
	// Verificar si el pago ya existe (por paymentId) para evitar duplicados
	paymentExists := false
	for _, existingPayment := range o.Payments {
		if existingPayment.PaymentID == e.Payment.PaymentId {
			paymentExists = true
			// Actualizar el pago existente en caso de que el status haya cambiado
			existingPayment.Status = e.Payment.Status
			existingPayment.ErrorMessage = e.Payment.ErrorMessage
			existingPayment.ErrorCode = e.Payment.ErrorCode
			break
		}
	}

	// Solo agregar si no existe
	if !paymentExists {
		o.Payments = append(o.Payments, &PaymentEvent{
			PaymentID:     e.Payment.PaymentId,
			Method:        e.Payment.Method,
			Amount:        e.Payment.Amount,
			TransactionID: e.Payment.TransactionId,
			Status:        e.Payment.Status,
			ErrorMessage:  e.Payment.ErrorMessage,
			ErrorCode:     e.Payment.ErrorCode,
		})
	}

	// Calcular total de pagos aprobados
	var totalApproved float32
	for _, p := range o.Payments {
		if p.Status == "approved" {
			totalApproved += p.Amount
		}
	}

	// Actualizar estado según pagos
	// IMPORTANTE: No modificar el estado si la orden ya fue cancelada
	if o.Status != Canceled {
		totalPrice := o.TotalPrice()
		if totalApproved >= totalPrice && totalPrice > 0 {
			o.Status = Paid
		} else if totalApproved > 0 {
			o.Status = PartiallyPaid
		} else if o.Status == Paid || o.Status == PartiallyPaid {
			// Si había pagos pero se reembolsaron todos
			o.Status = Payment_Defined
		}
	}

	o.Updated = e.Updated

	return o
}

func (s *orderService) updateCancel(o *Order, e *events.Event) *Order {
	// Marcar la orden como cancelada
	o.Status = Canceled
	o.Updated = e.Updated
	return o
}

func (s *orderService) FindByOrderId(orderId string) (*Order, error) {
	return s.repository.FindByOrderId(orderId)
}

func (s *orderService) FindByUserId(userId string) ([]*Order, error) {
	return s.repository.FindByUserId(userId)
}
