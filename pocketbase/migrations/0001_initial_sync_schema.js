migrate(
  (app) => {
    // 1. Criar coleção 'invites' vazia, sem regras de API (apenas superusuário)
    let invites
    try {
      invites = app.findCollectionByNameOrId('invites')
    } catch (_) {
      invites = new Collection({
        name: 'invites',
        type: 'base',
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: 'email', type: 'email', required: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_invites_email ON invites (email)'],
      })
      app.save(invites)
    }

    // 2. Atualizar 'users'
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    // Regras de acesso
    // createRule fechado: só e-mails presentes em 'invites'
    users.createRule = '@collection.invites.email ?= @request.body.email'
    users.listRule = 'id = @request.auth.id'
    users.viewRule = 'id = @request.auth.id'
    users.updateRule = 'id = @request.auth.id'
    users.deleteRule = 'id = @request.auth.id'

    // Configurações de autenticação e senhas
    if (users.passwordAuth) {
      users.passwordAuth.enabled = true
      users.passwordAuth.identityFields = ['email']
    }
    if (users.password) {
      users.password.min = 10
    }
    if (users.oauth2) {
      users.oauth2.enabled = false
    }
    if (users.otp) {
      users.otp.enabled = false
    }
    if (users.mfa) {
      users.mfa.enabled = false
    }

    // Configuração de URL de redefinição de senha e verificação
    if (users.resetPasswordTemplate) {
      users.resetPasswordTemplate.actionUrl =
        'https://rotina-2dcbb.goskip.app/redefinir-senha?token={TOKEN}'
    }
    if (users.verificationTemplate) {
      users.verificationTemplate.actionUrl =
        'https://rotina-2dcbb.goskip.app/confirmar-email?token={TOKEN}'
    }

    app.save(users)

    // 3. Criar coleção 'sync_records'
    let syncRecords
    try {
      syncRecords = app.findCollectionByNameOrId('sync_records')
    } catch (_) {
      syncRecords = new Collection({
        name: 'sync_records',
        type: 'base',
        listRule:
          "@request.auth.id != '' && @request.auth.verified = true && user = @request.auth.id",
        viewRule:
          "@request.auth.id != '' && @request.auth.verified = true && user = @request.auth.id",
        createRule:
          "@request.auth.id != '' && @request.auth.verified = true && @request.body.user = @request.auth.id",
        updateRule:
          "@request.auth.id != '' && @request.auth.verified = true && user = @request.auth.id && @request.body.user = @request.auth.id",
        deleteRule:
          "@request.auth.id != '' && @request.auth.verified = true && user = @request.auth.id",
        fields: [
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'entity',
            type: 'select',
            required: true,
            values: [
              'note',
              'book',
              'bookNote',
              'readingLog',
              'readingGoal',
              'exercise',
              'workoutPlanDay',
              'workoutLog',
              'course',
              'studyPage',
              'certificate',
              'studySession',
              'studyGoal',
              'project',
              'projectNote',
              'projectTask',
              'achievement',
              'experience',
              'workNote',
              'daySummary',
              'settings',
            ],
            maxSelect: 1,
          },
          {
            name: 'clientId',
            type: 'text',
            required: true,
          },
          {
            name: 'data',
            type: 'json',
            required: false,
            maxSize: 1048576, // 1 MB
          },
          {
            name: 'clientUpdatedAt',
            type: 'date',
            required: false,
          },
          {
            name: 'deletedAt',
            type: 'date',
            required: false,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_sync_records_user_clientId ON sync_records (user, clientId)',
          'CREATE INDEX idx_sync_records_user_entity ON sync_records (user, entity)',
          'CREATE INDEX idx_sync_records_updated ON sync_records (updated)',
        ],
      })
      app.save(syncRecords)
    }

    // 4. Criar coleção 'sync_files'
    let syncFiles
    try {
      syncFiles = app.findCollectionByNameOrId('sync_files')
    } catch (_) {
      syncFiles = new Collection({
        name: 'sync_files',
        type: 'base',
        listRule:
          "@request.auth.id != '' && @request.auth.verified = true && user = @request.auth.id",
        viewRule:
          "@request.auth.id != '' && @request.auth.verified = true && user = @request.auth.id",
        createRule:
          "@request.auth.id != '' && @request.auth.verified = true && @request.body.user = @request.auth.id",
        updateRule:
          "@request.auth.id != '' && @request.auth.verified = true && user = @request.auth.id && @request.body.user = @request.auth.id",
        deleteRule:
          "@request.auth.id != '' && @request.auth.verified = true && user = @request.auth.id",
        fields: [
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'clientId',
            type: 'text',
            required: true,
          },
          {
            name: 'file',
            type: 'file',
            required: true,
            maxSelect: 1,
            maxSize: 5242880, // 5 MB
            mimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif'],
            protected: true,
          },
          {
            name: 'fileType',
            type: 'text',
            required: false,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_sync_files_user_clientId ON sync_files (user, clientId)',
        ],
      })
      app.save(syncFiles)
    }
  },
  (app) => {
    try {
      const syncFiles = app.findCollectionByNameOrId('sync_files')
      app.delete(syncFiles)
    } catch (_) {}
    try {
      const syncRecords = app.findCollectionByNameOrId('sync_records')
      app.delete(syncRecords)
    } catch (_) {}
    try {
      const invites = app.findCollectionByNameOrId('invites')
      app.delete(invites)
    } catch (_) {}
  },
)
