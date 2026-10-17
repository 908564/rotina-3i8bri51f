migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.createRule = '@collection.invites.email:lower ?= @request.body.email:lower'
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.createRule = '@collection.invites.email ?= @request.body.email'
    app.save(users)
  },
)
