from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DepoViewSet, ItemViewSet, UnitViewSet, MoneyTypeViewSet, BuyListViewSet

router = DefaultRouter()
router.register(r'depolar', DepoViewSet, basename='depo')
router.register(r'itemler', ItemViewSet, basename='item')
router.register(r'unitler', UnitViewSet, basename='unit')
router.register(r'moneytypes', MoneyTypeViewSet, basename='moneytype')
router.register(r'buylist', BuyListViewSet, basename='buylist')


urlpatterns = [
    path('', include(router.urls)),
]
