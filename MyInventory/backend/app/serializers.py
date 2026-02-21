from rest_framework import serializers
from app.models import BuyList, Item, Unit, MoneyType, Depo


class ItemSerializer(serializers.ModelSerializer):
    company = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Item
        fields = ['id', 'name', 'company']


class UnitSerializer(serializers.ModelSerializer):
    # Frontend 'name' gönderiyor ama modelde alan adı 'unit'
    # write_only 'name' ile alıp 'unit' alanına yazıyoruz
    name = serializers.CharField(source='unit')
    company = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Unit
        fields = ['id', 'name', 'company']


class MoneyTypeSerializer(serializers.ModelSerializer):
    # Frontend 'name' gönderiyor ama modelde alan adı 'type'
    name = serializers.CharField(source='type')
    company = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = MoneyType
        fields = ['id', 'name', 'company']


class DepoSerializer(serializers.ModelSerializer):
    company = serializers.PrimaryKeyRelatedField(read_only=True)
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Depo
        fields = ['id', 'name', 'created_at', 'company', 'created_by']


class BuyListSerializer(serializers.ModelSerializer):
    # Frontend alan adları → Model alan adları
    qty     = serializers.FloatField(source='item_count')
    narx    = serializers.FloatField(source='item_price')
    unit    = serializers.PrimaryKeyRelatedField(source='item_unit',   queryset=Unit.objects.all())
    moneytype = serializers.PrimaryKeyRelatedField(source='money_type', queryset=MoneyType.objects.all())
    depolar = serializers.PrimaryKeyRelatedField(source='depo',        queryset=Depo.objects.all())
    company = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = BuyList
        fields = ['id', 'item', 'qty', 'narx', 'unit', 'moneytype', 'depolar', 'company', 'created_at']


class BuyListTotalSerializer(serializers.Serializer):
    depo_id = serializers.IntegerField()
    total_price = serializers.FloatField()