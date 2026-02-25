from .models import BuyList
from openpyxl import Workbook
from django.http import HttpResponse

def export_buylist_as_excel(request, depo_id):
    if not request.user.is_authenticated:
        return HttpResponse("Unauthorized", status=401)

    buylist_items = BuyList.objects.filter(
        company=request.user.company,
        depo_id=depo_id  # ← model field adı: depo (depolar değil)
    ).select_related('item', 'item_unit', 'money_type')

    wb = Workbook()
    ws = wb.active
    ws.title = "BuyList"

    headers = ["ID", "Item", "Miktar", "Birim", "Narx", "Para Birimi", "Sana"]
    ws.append(headers)

    for b in buylist_items:
        ws.append([
            b.id,
            b.item.name if b.item else "",
            float(b.item_count) if b.item_count is not None else 0,
            b.item_unit.unit if b.item_unit else "",   # ← Unit modelde .unit field'ı var
            float(b.item_price) if b.item_price is not None else 0,
            b.money_type.type if b.money_type else "",  # ← MoneyType modelde .type field'ı var
            b.created_at.strftime("%Y-%m-%d") if b.created_at else "",
        ])

    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = f'attachment; filename="depo_{depo_id}_buylist.xlsx"'
    wb.save(response)
    return response