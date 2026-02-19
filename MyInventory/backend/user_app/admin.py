from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Company

class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Company Info', {'fields': ('company', 'role')}),
    )
    list_display = ('username', 'email', 'company', 'role', 'is_staff', 'is_active')

admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(Company)