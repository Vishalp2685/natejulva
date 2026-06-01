from django.urls import path
from .views import (
    MyProfileView, 
    RecommendationsView, 
    PartnerPreferencesView,
    PublicProfileDetailsView,
    ProfileSearchView,
    LikeProfileView,
    UnmatchProfileView,
    LikesSentView,
    LikesReceivedView,
    MutualMatchesView,
    ChatMessagesView,
    ChatConversationsView
)

urlpatterns = [
    path('me/', MyProfileView.as_view(), name='my-profile'),
    path('preferences/', PartnerPreferencesView.as_view(), name='partner-preferences'),
    path('recommendations/', RecommendationsView.as_view(), name='recommendations'),
    path('search/', ProfileSearchView.as_view(), name='profile-search'),
    path('like/', LikeProfileView.as_view(), name='like-profile'),
    path('unmatch/', UnmatchProfileView.as_view(), name='unmatch-profile'),
    path('likes-sent/', LikesSentView.as_view(), name='likes-sent'),
    path('likes-received/', LikesReceivedView.as_view(), name='likes-received'),
    path('matches/', MutualMatchesView.as_view(), name='mutual-matches'),
    path('chat/<int:receiver_id>/', ChatMessagesView.as_view(), name='chat-messages'),
    path('chat/conversations/', ChatConversationsView.as_view(), name='chat-conversations'),
    path('<int:pk>/', PublicProfileDetailsView.as_view(), name='public-profile-details'),
]
