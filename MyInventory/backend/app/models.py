from django.db import models
from user_app.models import Company, CustomUser
import datetime

class Depo(models.Model):
    name = models.CharField(max_length=999)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='depolar')

    def __str__(self):
        return f"{self.name} ({self.company.name})"

class Item(models.Model):
    name = models.CharField(max_length=999)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='items')

    def __str__(self):
        return f"{self.name} ({self.company.name})"
    
class MoneyType(models.Model):
    type = models.CharField(max_length=50)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='moneytypes')

    def __str__(self):
        return self.type

class Unit(models.Model):
    unit = models.CharField(max_length=999)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='units')

    def __str__(self):
        return f"{self.unit} ({self.company.name})"

class BuyList(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='buylist')
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    item_count = models.FloatField()
    item_unit = models.ForeignKey(Unit, on_delete=models.CASCADE)
    item_price = models.FloatField()
    money_type = models.ForeignKey(MoneyType, on_delete=models.CASCADE)
    depo = models.ForeignKey(Depo, on_delete=models.CASCADE, related_name='buylist')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.item.name} x{self.item_count} ({self.company.name})"
