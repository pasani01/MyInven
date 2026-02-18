from django.db import models
import datetime
from user_app.models import Company, CustomUser 
# Create your models here.
class Depo(models.Model):
    name = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='depolar')

    def __str__(self):
        return self.name


class Item(models.Model):
    name = models.CharField(max_length=50)

    def __str__(self):
        return self.name
    
class MoneyType(models.Model):
    type = models.CharField(max_length=50)

    def __str__(self):
        return self.type

class Unit(models.Model):
    unit = models.CharField(max_length=50)

    def __str__(self):
        return self.unit



    def __str__(self):
        return str(datetime.datetime.now())
    
class BuyList(models.Model):
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    item_count = models.FloatField()
    item_unit = models.ForeignKey(Unit, on_delete=models.CASCADE)
    item_price = models.FloatField()
    money_type = models.ForeignKey(MoneyType, on_delete=models.CASCADE)
    depo = models.ForeignKey(Depo, on_delete=models.CASCADE, related_name='buylist')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return str(datetime.datetime.now())
    

    