from django.contrib import admin
from .models import BuyList, Item, Unit, MoneyType, Depo

class CompanyRestrictedAdmin(admin.ModelAdmin):
    # Normal admin sadece kendi company verilerini görsün
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(company=request.user.company)

    # Kaydı kaydederken sadece kendi company ile kaydet
    def save_model(self, request, obj, form, change):
        if not request.user.is_superuser:
            obj.company = request.user.company
        super().save_model(request, obj, form, change)

# Item admin
@admin.register(Item)
class ItemAdmin(CompanyRestrictedAdmin):
    list_display = ('name', 'company')

# Unit admin
@admin.register(Unit)
class UnitAdmin(CompanyRestrictedAdmin):
    list_display = ('unit', 'company')

# Depo admin
@admin.register(Depo)
class DepoAdmin(CompanyRestrictedAdmin):
    list_display = ('name', 'company', 'created_by')

# MoneyType admin (company bazlı değilse normal admin yeterli)
@admin.register(MoneyType)
class MoneyTypeAdmin(admin.ModelAdmin):
    list_display = ('type',)

# BuyList admin
@admin.register(BuyList)
class BuyListAdmin(CompanyRestrictedAdmin):
    list_display = ('item', 'item_count', 'item_unit', 'item_price', 'money_type', 'depo', 'created_at')
