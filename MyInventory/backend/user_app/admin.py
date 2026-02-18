# user_app/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Company

class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'company', 'is_staff', 'is_superuser')
    list_filter = ('company', 'is_staff', 'is_superuser')
    
    # Form veya admin üzerinden süperuser kontrolü
    def get_readonly_fields(self, request, obj=None):
        readonly = super().get_readonly_fields(request, obj)
        # Eğer bir superuser değilse, is_superuser ve is_staff alanlarını readonly yap
        if not request.user.is_superuser:
            readonly += ('is_staff', 'is_superuser')
        return readonly

admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(Company)
