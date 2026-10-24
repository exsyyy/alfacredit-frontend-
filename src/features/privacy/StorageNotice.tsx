import { useState } from 'react'
import { createPortal } from 'react-dom'
import Disclosure from '../../components/Disclosure'
import Presence from '../../components/Presence'

const key = 'alfacredit.storage-notice.v1'

export default function StorageNotice() {
  const [visible, setVisible] = useState(() => {
    try { return localStorage.getItem(key) !== 'accepted' } catch { return true }
  })
  return <>
    <button className="text-button storage-settings" type="button" onClick={() => setVisible(true)}>Cookie и данные</button>
    {createPortal(<Presence show={visible}><section className="storage-notice" aria-label="Cookie и хранение данных">
      <div><strong>Cookie и хранение данных</strong>
        <p>Кабинет использует хранилище браузера для входа и запоминания этого уведомления. В демо-режиме заявки сохраняются на устройстве, в API-режиме — в тестовой базе.</p>
        <Disclosure summary="Подробнее"><p>JWT хранится до закрытия вкладки. Пароль не сохраняется. Аналитические и рекламные cookie не подключены. Это демонстрационный текст; политика обработки данных для рабочего сервиса пока не опубликована.</p></Disclosure>
      </div>
      <button type="button" className="primary-button" onClick={() => { try { localStorage.setItem(key, 'accepted') } catch { /* Still allow dismissing for this visit. */ } setVisible(false) }}>Понятно</button>
    </section></Presence>, document.body)}
  </>
}
