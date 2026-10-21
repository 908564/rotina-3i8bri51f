/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const syncRecords = app.findCollectionByNameOrId('sync_records')
    const entityField = syncRecords.fields.getByName('entity')
    if (entityField) {
      const currentValues = entityField.values || []
      if (!currentValues.includes('task')) {
        currentValues.push('task')
      }
      entityField.values = currentValues
      app.save(syncRecords)
    }
  },
  (app) => {
    try {
      const syncRecords = app.findCollectionByNameOrId('sync_records')
      const entityField = syncRecords.fields.getByName('entity')
      if (entityField && entityField.values) {
        entityField.values = entityField.values.filter((v) => v !== 'task')
        app.save(syncRecords)
      }
    } catch (_) {}
  },
)
