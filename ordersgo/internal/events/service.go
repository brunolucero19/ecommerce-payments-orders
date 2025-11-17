package events

import (
	"github.com/go-playground/validator/v10"
	"github.com/nmarsollier/commongo/errs"
	"github.com/nmarsollier/commongo/log"
)

type EventService interface {
	SavePlaceOrder(data *PlacedOrderData) (*Event, error)
	SavePayment(data *PaymentEvent) (*Event, error)
	SaveArticleExist(data *ValidationEvent) (*Event, error)
	FindByOrderId(orderId string) ([]*Event, error)
}

func NewEventService(log log.LogRusEntry, repository EventsRepository) EventService {
	return &eventService{
		log:        log,
		repository: repository,
	}
}

type eventService struct {
	log        log.LogRusEntry
	repository EventsRepository
}

// SaveArticleExist saves the event for article exist
func (s *eventService) SaveArticleExist(data *ValidationEvent) (*Event, error) {
	event, err := s.repository.Insert(newValidationEvent(data))

	if err != nil {
		return nil, err
	}

	return event, nil
}

// SavePlaceOrder saves the event for place order
func (s *eventService) SavePlaceOrder(data *PlacedOrderData) (*Event, error) {
	if e, _ := s.repository.FindPlaceByCartId(data.CartId); e != nil {
		s.log.Error("Place already exist")
		return nil, errs.AlreadyExist
	}

	if err := validator.New().Struct(data); err != nil {
		s.log.Error("Invalid NewPlaceData Data", err)
		return nil, err
	}

	event := s.placeOrderToEvent(data)
	event, err := s.repository.Insert(event)

	if err != nil {
		s.log.Error(err)
		return nil, err
	}

	return event, nil
}

type PlacedOrderData struct {
	CartId   string                  `json:"cartId" binding:"required,min=1,max=100"`
	UserId   string                  `json:"userId" binding:"required,min=1,max=100"`
	Articles []PlacePrderArticleData `json:"articles" binding:"required,gt=0"`
}

type PlacePrderArticleData struct {
	Id       string `json:"id" binding:"required,min=1,max=100"`
	Quantity int    `json:"quantity" binding:"required,min=1"`
}

func (s *eventService) placeOrderToEvent(event *PlacedOrderData) *Event {
	articles := make([]Article, len(event.Articles))
	for index, item := range event.Articles {
		articles[index] = Article{
			ArticleId: item.Id,
			Quantity:  item.Quantity,
		}
	}

	return newPlaceEvent(&PlaceEvent{
		CartId:   event.CartId,
		UserId:   event.UserId,
		Articles: articles,
	})
}

// SavePayment saves a payment event
func (s *eventService) SavePayment(data *PaymentEvent) (*Event, error) {
	event, err := s.repository.Insert(newPaymentEvent(data))

	if err != nil {
		return nil, err
	}

	return event, nil
}

// FindByOrderId returns all events for an order
func (s *eventService) FindByOrderId(orderId string) ([]*Event, error) {
	return s.repository.FindByOrderId(orderId)
}
