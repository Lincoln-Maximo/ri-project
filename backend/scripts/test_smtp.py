import smtplib
import os
import ssl
from email.message import EmailMessage

def test_smtp():
    smtp_server = os.getenv("MAIL_SERVER")
    port = int(os.getenv("MAIL_PORT", 587))
    sender_email = os.getenv("MAIL_USERNAME")
    password = os.getenv("MAIL_PASSWORD")

    print(f"DEBUG: Tentando conectar a {smtp_server}:{port} como {sender_email}")
    
    msg = EmailMessage()
    msg['Subject'] = 'TESTE DIAGNOSTICO SMTP'
    msg['From'] = sender_email
    msg['To'] = sender_email
    msg.set_content('Teste de diagnóstico bem-sucedido via socket puro.')

    context = ssl.create_default_context()
    try:
        with smtplib.SMTP(smtp_server, port, timeout=30) as server:
            server.set_debuglevel(2) # Debug máximo
            server.starttls(context=context)
            server.login(sender_email, password)
            server.send_message(msg)
            print("SUCESSO: E-mail enviado com smtp nativo!")
    except Exception as e:
        print(f"FALHA CRÍTICA: {e}")

if __name__ == "__main__":
    test_smtp()
