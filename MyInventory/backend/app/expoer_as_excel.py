
from .models import BuyList
from user_app.models import Company
from openpyxl import Workbook
from django.http import HttpResponse

def export_buylist_as_excel(request,depo_id):
    if not request.user.is_authenticated:
        return HttpResponse("Unauthorized", status=401)
    if request.user.company != BuyList.objects.get(id=depo_id).company:
        return HttpResponse("Unauthorized", status=401)
    
    buylist_items = BuyList.objects.filter(company=request.user.company)
    
    if depo_id:
        buylist_items = buylist_items.filter(depo_id=depo_id)

    wb = Workbook()
    ws = wb.active
    ws.title = "BuyList"

    headers = ["ID", "Item", "Miktar", "Birim", "Narx", "Para Birimi"]
    ws.append(headers)

    for item in buylist_items:
        ws.append([
            item.id,
            item.item.name if item.item else "",
            item.qty,
            item.unit.name if item.unit else "",
            item.narx,
            item.moneytype.name if item.moneytype else "",
        ])

    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = 'attachment; filename="buy_list.xlsx"'
    wb.save(response)

    return response
