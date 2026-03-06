from __future__ import annotations

from ..models import Ingredient, Order, OrderDelivery, Payment, Product, Recipe, User


class Serializer:
    @staticmethod
    def user(user: User, *, include_created_at: bool = False) -> dict:
        payload = {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "is_admin": user.is_admin,
        }
        if include_created_at:
            payload["created_at"] = user.created_at.isoformat()
        return payload

    @staticmethod
    def ingredient(ingredient: Ingredient) -> dict:
        return {
            "id": ingredient.id,
            "name": ingredient.name,
            "unit": ingredient.unit,
        }

    @staticmethod
    def product(product: Product) -> dict:
        return {
            "id": product.id,
            "name": product.name,
            "description": product.description,
            "price": float(product.price),
            "category": product.category,
            "image_url": product.image_url,
            "available": product.available,
            "ingredients": [
                Serializer.ingredient(ingredient)
                for ingredient in product.ingredients
            ],
        }

    @staticmethod
    def recipe(recipe: Recipe) -> dict:
        return {
            "id": recipe.id,
            "title": recipe.title,
            "summary": recipe.summary,
            "ingredients": recipe.ingredients,
            "steps": recipe.steps,
            "image_url": recipe.image_url,
            "category": recipe.category,
            "status": recipe.status,
            "created_at": recipe.created_at.isoformat(),
        }

    @staticmethod
    def delivery(delivery: OrderDelivery | None) -> dict | None:
        if not delivery:
            return None
        return {
            "customer_name": delivery.customer_name,
            "customer_email": delivery.customer_email,
            "customer_phone": delivery.customer_phone,
            "delivery_method": delivery.delivery_method,
            "address": delivery.address,
            "neighborhood": delivery.neighborhood,
            "city": delivery.city,
            "shipping_amount": float(delivery.shipping_amount),
            "notes": delivery.notes,
            "payment_method": delivery.payment_method,
        }

    @staticmethod
    def payment(payment: Payment) -> dict:
        return {
            "id": payment.id,
            "provider": payment.provider,
            "provider_payment_id": payment.provider_payment_id,
            "amount": float(payment.amount),
            "currency": payment.currency,
            "status": payment.status,
            "created_at": payment.created_at.isoformat(),
        }

    @staticmethod
    def order(order: Order) -> dict:
        return {
            "id": order.id,
            "user_id": order.user_id,
            "status": order.status,
            "total_amount": float(order.total_amount),
            "created_at": order.created_at.isoformat(),
            "user": Serializer.user(order.user),
            "items": [
                {
                    "id": item.id,
                    "product_id": item.product_id,
                    "quantity": item.quantity,
                    "unit_price": float(item.unit_price),
                    "product_name": item.product.name,
                }
                for item in order.items
            ],
            "delivery": Serializer.delivery(order.delivery),
            "payments": [Serializer.payment(payment) for payment in order.payments],
        }
