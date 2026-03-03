# Migration to add Conversation and Message models to existing production database
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('user_app', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RunSQL(
            # Create Conversation table if not exists
            sql="""
            CREATE TABLE IF NOT EXISTS "user_app_conversation" (
                "id" bigserial NOT NULL PRIMARY KEY,
                "created_at" timestamp with time zone NOT NULL
            );
            CREATE TABLE IF NOT EXISTS "user_app_conversation_participants" (
                "id" bigserial NOT NULL PRIMARY KEY,
                "conversation_id" bigint NOT NULL REFERENCES "user_app_conversation" ("id") DEFERRABLE INITIALLY DEFERRED,
                "customuser_id" bigint NOT NULL REFERENCES "user_app_customuser" ("id") DEFERRABLE INITIALLY DEFERRED,
                UNIQUE ("conversation_id", "customuser_id")
            );
            CREATE TABLE IF NOT EXISTS "user_app_message" (
                "id" bigserial NOT NULL PRIMARY KEY,
                "text" text NULL,
                "created_at" timestamp with time zone NOT NULL,
                "is_read" boolean NOT NULL DEFAULT false,
                "attachment" varchar(100) NULL,
                "conversation_id" bigint NOT NULL REFERENCES "user_app_conversation" ("id") DEFERRABLE INITIALLY DEFERRED,
                "sender_id" bigint NOT NULL REFERENCES "user_app_customuser" ("id") DEFERRABLE INITIALLY DEFERRED
            );
            CREATE TABLE IF NOT EXISTS "user_app_usersettings" (
                "id" bigserial NOT NULL PRIMARY KEY,
                "dark_mode" boolean NOT NULL DEFAULT false,
                "language" varchar(10) NOT NULL DEFAULT 'en',
                "fone_color" integer NOT NULL DEFAULT 0,
                "user_id" bigint NOT NULL UNIQUE REFERENCES "user_app_customuser" ("id") DEFERRABLE INITIALLY DEFERRED
            );
            """,
            reverse_sql="""
            DROP TABLE IF EXISTS "user_app_message";
            DROP TABLE IF EXISTS "user_app_conversation_participants";
            DROP TABLE IF EXISTS "user_app_conversation";
            DROP TABLE IF EXISTS "user_app_usersettings";
            """
        ),
    ]
