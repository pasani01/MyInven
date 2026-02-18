from django.contrib import admin
from .models import BuyList, Item, Unit, MoneyType, Depo

# Register your models here.
admin.site.register(BuyList)
admin.site.register(Item)
admin.site.register(Unit)
admin.site.register(MoneyType)
admin.site.register(Depo)
