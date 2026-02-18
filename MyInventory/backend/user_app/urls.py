from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomUserViewSet, CompanyViewSet

router = DefaultRouter()
router.register(r'companies', CompanyViewSet, basename='company')
router.register(r'users', CustomUserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
]
