//import { query } from '../database.js';
const { query } = require('../database');
// Funções do controller

const path = require('path');

exports.abrirCrudPessoa = (req, res) => {
  console.log('pessoaController - Rota /abrirCrudPessoa - abrir o crudPessoa');
  res.sendFile(path.join(__dirname, '../../frontend/pessoa/pessoa.html'));
}

exports.listarPessoas = async (req, res) => {
  try {
    const result = await query('SELECT * FROM pessoa ORDER BY cpfpessoa');
    // console.log('Resultado do SELECT:', result.rows);//verifica se está retornando algo
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar pessoas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
exports.criarPessoa = async (req, res) => {
  //  console.log('Criando pessoa com dados:', req.body);
  try {
    const { cpfpessoa, nomepessoa, datanascimentopessoa, emailpessoa, senhapessoa} = req.body;

    // Validação básica
if (!nomepessoa) {
  return res.status(400).json({
    error: 'O campo nomepessoa é obrigatório'
  });
}

    const result = await query(
      'INSERT INTO pessoa (cpfpessoa, nomepessoa, datanascimentopessoa, emailpessoa, senhapessoa) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [cpfpessoa, nomepessoa, datanascimentopessoa, emailpessoa, senhapessoa]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar pessoa:', error);

   

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
    const cpf = parseInt(req.params.cpf);

    if (isNaN(cpf)) {
      return res.status(400).json({ error: 'CPF deve ser um número válido' });
    }

    const result = await query(
      'SELECT * FROM pessoa WHERE cpfpessoa = $1',
      [cpf]
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
    const { nomepessoa, emailpessoa, senhapessoa, datanascimentopessoa } = req.body;

    // Validação de email se fornecido
    if (emailpessoa) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailpessoa)) {
        return res.status(400).json({
          error: 'Formato de email inválido'
        });
      }
    }
    // Verifica se a pessoa existe
    const existingPersonResult = await query(
      'SELECT * FROM pessoa WHERE cpfpessoa = $1',
      [cpf]
    );

    if (existingPersonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

   // Constrói a query de atualização dinamicamente para campos não nulos
   const currentPerson = existingPersonResult.rows[0];
   const updatedFields = {
     nomepessoa: nomepessoa !== undefined ? nomepessoa : currentPerson.nomepessoa,
     emailpessoa: emailpessoa !== undefined ? emailpessoa : currentPerson.emailpessoa,
     senhapessoa: senhapessoa !== undefined ? senhapessoa : currentPerson.senhapessoa,
     datanascimentopessoa: datanascimentopessoa !== undefined ? datanascimentopessoa : currentPerson.datanascimentopessoa
   };
  

   // Atualiza a pessoa
   const updateResult = await query(
    'UPDATE pessoa SET nomepessoa = $1, emailpessoa = $2, senhapessoa = $3, datanascimentopessoa = $4 WHERE cpfpessoa = $6 RETURNING *',
    [updatedFields.nomepessoa, updatedFields.emailpessoa, updatedFields.senhapessoa, updatedFields.datanascimentopessoa, cpf]
  );

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar pessoa:', error);

    
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

exports.deletarPessoa = async (req, res) => {
  try {
    const cpf = parseInt(req.params.cpf);
    // Verifica se a pessoa existe
    const existingPersonResult = await query(
      'SELECT * FROM pessoa WHERE cpfpessoa = $1',
      [cpf]
    );

    if (existingPersonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    // Deleta a pessoa (as constraints CASCADE cuidarão das dependências)
    await query(
      'DELETE FROM pessoa WHERE cpfpessoa = $1',
      [cpf]
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
      'SELECT * FROM pessoa WHERE emailpessoa = $1',
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
    const cpf = parseInt(req.params.id);
    const { senha_atual, nova_senha } = req.body;

    if (isNaN(cpf)) {
      return res.status(400).json({ error: 'CPF deve ser um número válido' });
    }

    if (!senha_atual || !nova_senha) {
      return res.status(400).json({
        error: 'Senha atual e nova senha são obrigatórias'
      });
    }

    // Verifica se a pessoa existe e a senha atual está correta
    const personResult = await query(
      'SELECT * FROM pessoa WHERE cpfpessoa = $1',
      [cpf]
    );

    if (personResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    const person = personResult.rows[0];

    // Verificação básica da senha atual (em produção, use hash)
    if (person.senhapessoa !== senha_atual) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    // Atualiza apenas a senha
    const updateResult = await query(
      'UPDATE pessoa SET senhapessoa = $1 WHERE cpfpessoa = $2 RETURNING cpfpessoa, nomepessoa, emailpessoa, datanascimentopessoa',
      [nova_senha, cpf]
    );

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}