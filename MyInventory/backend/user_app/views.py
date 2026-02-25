class UserLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, company_token):  # URL'den company_token alıyoruz
        username = request.data.get("username")
        password = request.data.get("password")

        # Şirketi doğrula
        try:
            company = Company.objects.get(company_id=company_token, is_active=True)
        except Company.DoesNotExist:
            return Response({"detail": "Geçersiz şirket linki"}, status=status.HTTP_404_NOT_FOUND)

        # O şirketteki kullanıcıyı bul
        try:
            user = CustomUser.objects.get(username=username, company=company)
        except CustomUser.DoesNotExist:
            return Response({"detail": "Kullanıcı adı veya şifre hatalı"}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(password):
            return Response({"detail": "Kullanıcı adı veya şifre hatalı"}, status=status.HTTP_400_BAD_REQUEST)

        if not user.is_active:
            return Response({"detail": "Kullanıcı pasif"}, status=status.HTTP_400_BAD_REQUEST)

        token, created = Token.objects.get_or_create(user=user)

        return Response({
            "token": token.key,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "company": user.company_id,
                "company_name": user.company.name,
            }
        })