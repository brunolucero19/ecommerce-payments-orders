package order

import (
	"context"

	"github.com/nmarsollier/commongo/db"
	"github.com/nmarsollier/commongo/errs"
	"github.com/nmarsollier/commongo/log"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type OrderRepository interface {
	Insert(order *Order) (*Order, error)
	FindByOrderId(orderId string) (*Order, error)
	FindByUserId(userId string) ([]*Order, error)
}

func NewOrderRepository(log log.LogRusEntry, collection db.Collection) OrderRepository {
	return &orderRepository{
		log:        log,
		collection: collection,
	}
}

type orderRepository struct {
	log        log.LogRusEntry
	collection db.Collection
}

func (r *orderRepository) Insert(order *Order) (*Order, error) {
	if err := order.ValidateSchema(); err != nil {
		r.log.Error(err)
		return nil, err
	}

	filter := bson.M{"orderId": order.OrderId}
	upsert := true
	updateOptions := options.UpdateOptions{
		Upsert: &upsert,
	}
	document := upsertOrder{
		Set: order,
	}

	if _, err := r.collection.UpdateOne(context.Background(), filter, document, &updateOptions); err != nil {
		r.log.Error(err)
		return nil, err
	}
	return order, nil
}

type upsertOrder struct {
	Set *Order `bson:"$set"`
}

func (r *orderRepository) FindByOrderId(orderId string) (*Order, error) {
	order := &Order{}
	filter := bson.M{"orderId": orderId}
	if err := r.collection.FindOne(context.Background(), filter, order); err != nil {
		if err.Error() == "mongo: no documents in result" {
			return nil, errs.NotFound
		}
		r.log.Error(err)
		return nil, err
	}

	return order, nil
}

// FindAll devuelve todos los eventos por order id
func (r *orderRepository) FindByUserId(userId string) ([]*Order, error) {
	filter := bson.M{"userId": userId}
	cur, err := r.collection.Find(context.Background(), filter)
	if err != nil {
		r.log.Error(err)
		return nil, err
	}
	defer cur.Close(context.Background())

	orders := []*Order{}
	for cur.Next(context.Background()) {
		order := &Order{}
		if err := cur.Decode(order); err != nil {
			r.log.Error(err)
			return nil, err
		}
		orders = append(orders, order)
	}

	return orders, nil
}
