from rest_framework.routers import DefaultRouter
from .views import SurveyViewSet

router = DefaultRouter()
router.register(r"surveys", SurveyViewSet, basename="survey")

urlpatterns = router.urls
