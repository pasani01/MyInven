from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Company

class CustomUserAdmin(UserAdmin):
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email')}),
        ('Company Info', {'fields': ('company', 'role')}),  # ayrı sekme yok, aynı sayfada
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',), 'fields': ('username', 'password1', 'password2', 'company', 'role')}),
    )
    list_display = ('username', 'email', 'company', 'role', 'is_staff', 'is_active')
    list_filter = ('role', 'company', 'is_active', 'is_staff')
    search_fields = ('username', 'email')
    ordering = ('company', 'username')

    def save_model(self, request, obj, form, change):
        if not change and obj.company:
            if CustomUser.objects.filter(username=obj.username, company=obj.company).exists():
                from django.core.exceptions import ValidationError
                raise ValidationError(
                    f"Bu şirkette '{obj.username}' kullanıcı adı zaten mevcut."
                )
        super().save_model(request, obj, form, change)
admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(Company)