from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomUserViewSet, CompanyViewSet, UserLoginView, UserLogoutView,VerifyEmailView

router = DefaultRouter()
router.register(r'companies', CompanyViewSet, basename='company')
router.register(r'users', CustomUserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),  # ViewSet endpointleri
    path('login/', UserLoginView.as_view(), name='user-login'),    # normal kullanıcı login
    path('logout/', UserLogoutView.as_view(), name='user-logout'), # normal kullanıcı logout
    path('verify-email/', VerifyEmailView.as_view(), name='verify-email'),
]
