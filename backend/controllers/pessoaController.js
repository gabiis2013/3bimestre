//import { query } from '../database.js';
const db = require('../database');
// Funções do controller

const path = require('path');

exports.abrirCrudPessoa = (req, res) => {
//  console.log('pessoaController - Rota /abrirCrudPessoa - abrir o crudPessoa');
  res.sendFile(path.join(__dirname, '../../frontend/pessoa/pessoa.html'));
}

exports.listarPessoas = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM pessoa ORDER BY cpfPessoa');
    // console.log('Resultado do SELECT:', result.rows);//verifica se está retornando algo
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar pessoas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
/*CREATE TABLE Pessoa (
    cpfPessoa CHAR(11) PRIMARY KEY,
    nomePessoa VARCHAR(60) NOT NULL,
    dataNascimentoPessoa DATE NOT NULL,
    emailPessoa VARCHAR(100) UNIQUE NOT NULL,
    senhaPessoa VARCHAR(255) NOT NULL
);

*/

exports.criarPessoa = async (req, res) => {
  //  console.log('Criando pessoa com dados:', req.body);
  try {
    const { cpfPessoa, nomePessoa, emailPessoa, senhaPessoa = true, dataNascimentoPessoa } = req.body;

    // Validação básica
    if (!nomePessoa || !emailPessoa || !senhaPessoa) {
      return res.status(400).json({
        error: 'Nome, email e senha são obrigatórios'
      });
    }

    // Validação de email básica
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailPessoa)) {
      return res.status(400).json({
        error: 'Formato de email inválido'
      });
    }

    const result = await query(
      'INSERT INTO pessoa (cpfPessoa, nomePessoa, emailPessoa, senhaPessoa, dataNascimentoPessoa) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [cpfPessoa, nomePessoa, emailPessoa, senhaPessoa, dataNascimentoPessoa]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar pessoa:', error);

    // Verifica se é erro de email duplicado (constraint unique violation)
    if (error.code === '23505' && error.constraint === 'pessoa_emailPessoa_key') {
      return res.status(400).json({
        error: 'Email já está em uso'
      });
    }

    // Verifica se é erro de violação de constraint NOT NULL
    if (error.code === '23502') {
      return res.status(400).json({
        error: 'Dados obrigatórios não fornecidos'
      });
    }

    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

exports.obterPessoa = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID deve ser um número válido' });
    }

    const result = await query(
      'SELECT * FROM pessoa WHERE cpfPessoa = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter pessoa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

exports.atualizarPessoa = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nomePessoa, emailPessoa, senhaPessoa, dataNascimentoPessoa } = req.body;

    // Validação de email se fornecido
    if (emailPessoa) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailPessoa)) {
        return res.status(400).json({
          error: 'Formato de email inválido'
        });
      }
    }
    // Verifica se a pessoa existe
    const existingPersonResult = await query(
      'SELECT * FROM pessoa WHERE cpfPessoa = $1',
      [id]
    );

    if (existingPersonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    // Constrói a query de atualização dinamicamente para campos não nulos
    const currentPerson = existingPersonResult.rows[0];
    const updatedFields = {
      nomePessoa: nomePessoa !== undefined ? nomePessoa : currentPerson.nomePessoa,
      emailPessoa: emailPessoa !== undefined ? emailPessoa : currentPerson.emailPessoa,
      senhaPessoa: senhaPessoa !== undefined ? senhaPessoa : currentPerson.senhaPessoa,
      //primeiro_acesso_pessoa: primeiro_acesso_pessoa !== undefined ? primeiro_acesso_pessoa : currentPerson.primeiro_acesso_pessoa,
      dataNascimentoPessoa: dataNascimentoPessoa !== undefined ? dataNascimentoPessoa : currentPerson.dataNascimentoPessoa
    };

    // Atualiza a pessoa
    const updateResult = await query(
      'UPDATE pessoa SET nomePessoa = $1, emailPessoa = $2, senhaPessoa = $3, dataNascimentoPessoa = $4 WHERE cpfPessoa = $5 RETURNING *',
      [updatedFields.nomePessoa, updatedFields.emailPessoa, updatedFields.senhaPessoa, updatedFields.dataNascimentoPessoa, id]
    );

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar pessoa:', error);

    // Verifica se é erro de email duplicado
    if (error.code === '23505' && error.constraint === 'pessoa_emailPessoa_key') {
      return res.status(400).json({
        error: 'Email já está em uso por outra pessoa'
      });
    }

    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

exports.deletarPessoa = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // Verifica se a pessoa existe
    const existingPersonResult = await query(
      'SELECT * FROM pessoa WHERE cpfPessoa = $1',
      [id]
    );

    if (existingPersonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    // Deleta a pessoa (as constraints CASCADE cuidarão das dependências)
    await query(
      'DELETE FROM pessoa WHERE cpfPessoa = $1',
      [id]
    );

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar pessoa:', error);

    // Verifica se é erro de violação de foreign key (dependências)
    if (error.code === '23503') {
      return res.status(400).json({
        error: 'Não é possível deletar pessoa com dependências associadas'
      });
    }

    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Função adicional para buscar pessoa por email
exports.obterPessoaPorEmail = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    const result = await query(
      'SELECT * FROM pessoa WHERE emailPessoa = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter pessoa por email:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Função para atualizar apenas a senha
exports.atualizarSenha = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { senha_atual, nova_senha } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID deve ser um número válido' });
    }

    if (!senha_atual || !nova_senha) {
      return res.status(400).json({
        error: 'Senha atual e nova senha são obrigatórias'
      });
    }

    // Verifica se a pessoa existe e a senha atual está correta
    const personResult = await query(
      'SELECT * FROM pessoa WHERE cpfPessoa = $1',
      [id]
    );

    if (personResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    const person = personResult.rows[0];

    // Verificação básica da senha atual (em produção, use hash)
    if (person.senhaPessoa !== senha_atual) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    // Atualiza apenas a senha
    const updateResult = await query(
      'UPDATE pessoa SET senhaPessoa = $1 WHERE cpfPessoa = $2 RETURNING cpfPessoa, nomePessoa, emailPessoa, dataNascimentoPessoa',
      [nova_senha, id]
    );

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}