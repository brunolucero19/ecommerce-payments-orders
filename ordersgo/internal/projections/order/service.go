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
	o.Payments = append(o.Payments, &PaymentEvent{
		Method: e.Payment.Method,
		Amount: e.Payment.Amount,
	})

	if o.TotalPayment() >= o.TotalPrice() {
		o.Status = Payment_Defined
	}

	o.Updated = e.Updated

	return o
}

func (s *orderService) FindByOrderId(orderId string) (*Order, error) {
	return s.repository.FindByOrderId(orderId)
}

func (s *orderService) FindByUserId(userId string) ([]*Order, error) {
	return s.repository.FindByUserId(userId)
}
