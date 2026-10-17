// Hook para validar o tamanho máximo de 1 MB no campo json 'data' de 'sync_records'
onRecordCreate((e) => {
  const dataRaw = e.record.getString('data')
  if (dataRaw && dataRaw.length > 1048576) {
    throw new BadRequestError('O campo data não pode exceder 1 MB.')
  }
  return e.next()
}, 'sync_records')

onRecordUpdate((e) => {
  const dataRaw = e.record.getString('data')
  if (dataRaw && dataRaw.length > 1048576) {
    throw new BadRequestError('O campo data não pode exceder 1 MB.')
  }
  return e.next()
}, 'sync_records')
