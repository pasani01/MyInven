from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomUserViewSet, CompanyViewSet, UserLoginView, UserLogoutView

router = DefaultRouter()
router.register(r'companies', CompanyViewSet)
router.register(r'users', CustomUserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    path('<str:company_token>/login/', UserLoginView.as_view(), name='login'),
    path('logout/', UserLogoutView.as_view(), name='logout'),
]