from rest_framework import serializers
from app.models import BuyList, Item, Unit, MoneyType, Depo


class BuyListSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuyList
        fields = '__all__'



class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = '__all__'


class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = '__all__'


class MoneyTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MoneyType
        fields = '__all__'


class DepoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Depo
        fields = '__all__'


class BuyListTotalSerializer(serializers.Serializer):
    depo_id = serializers.IntegerField()
    total_price = serializers.FloatField()