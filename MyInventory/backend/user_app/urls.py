from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomUserViewSet, CompanyViewSet, UserLoginView, UserLogoutView, ConversationViewSet, MessageViewSet, ChatDebugView

router = DefaultRouter()
router.register(r'companies', CompanyViewSet)
router.register(r'users', CustomUserViewSet, basename='user')
router.register(r'messages', MessageViewSet, basename='message')

urlpatterns = [
    path('', include(router.urls)),
    path('<str:company_token>/login/', UserLoginView.as_view(), name='login'),
    path('logout/', UserLogoutView.as_view(), name='logout'),

    # message urls
    path('conversations/', ConversationViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('conversations/<int:pk>/', ConversationViewSet.as_view({'get': 'retrieve'})),

    # debug endpoint (remove after fixing)
    path('chat-debug/', ChatDebugView.as_view(), name='chat-debug'),
]