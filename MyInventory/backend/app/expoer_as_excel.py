from .models import BuyList
from openpyxl import Workbook
from django.http import HttpResponse

def export_buylist_as_excel(request, depo_id):
    if not request.user.is_authenticated:
        return HttpResponse("Unauthorized", status=401)
    
    try:
        buylist_items = BuyList.objects.filter(
            company=request.user.company,
            depolar_id=depo_id  # ← depo_id ile filtrele
        )
    except Exception as e:
        return HttpResponse(f"Error: {e}", status=500)

    wb = Workbook()
    ws = wb.active
    ws.title = "BuyList"

    headers = ["ID", "Item", "Miktar", "Birim", "Narx", "Para Birimi"]
    ws.append(headers)

    for item in buylist_items:
        ws.append([
            item.id,
            item.item.name if item.item else "",
            float(item.qty) if item.qty else 0,
            item.unit.name if item.unit else "",
            float(str(item.narx).replace(",", "")) if item.narx else 0,
            item.moneytype.name if item.moneytype else "",
        ])

    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = f'attachment; filename="depo_{depo_id}_buylist.xlsx"'
    wb.save(response)
    return response