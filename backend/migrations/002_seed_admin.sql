-- Cria um usuário administrador inicial caso ainda não exista.
-- Senha padrão: "admin123" (MD5 = 0192023a7bbd73250516f069df18b500)
-- ATENÇÃO: troque a senha após o primeiro login.

INSERT INTO usuarios (nome, login, senha, status)
SELECT 'Administrador', 'admin', '0192023a7bbd73250516f069df18b500', 'ativo'
WHERE NOT EXISTS (
    SELECT 1 FROM usuarios WHERE login = 'admin'
);
