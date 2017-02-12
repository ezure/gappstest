function doGet(e){
  // フォームから受け取った値を使って必要な変数を作っていきます --------
  var sheet = SpreadsheetApp.openById(e.parameter.SPREADSHEET_ID).getSheetByName(e.parameter.SHEET_NAME)
  var last_row = sheet.getLastRow()
  
  // スプレッドシートに追加したくない値を「ignore_array」で指定して、
  // 必要なデータだけを「form_data」に入れていきます。
  var ignore_array = ['メールアドレス', 'SPREADSHEET_ID', 'SHEET_NAME', 'callback', '_']
  var form_data = {}
  for(var key in e.parameter){
    if(ignore_array.indexOf(key) === -1){
      form_data[key] = e.parameter[key]
    }
  }
  
  // スプレッドシートの初期設定 --------
  // スプレッドシートに何も値が入っていないと以降の処理で問題が起きる+フォームの送信日時を挿入する為に、
  // A1に「タイムスタンプ」を挿入します。
  if(last_row === 0 && sheet.getLastColumn() === 0){
    sheet.getRange(1, 1).setValue("タイムスタンプ")
    last_row++
  }

  // Spreadsheetにフォームのデータを挿入 --------
  // スプレッドシートの１行目をヘッダーとして取得します。
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
  // 「form_data」に「for in」を使ってループ処理を行います。
  for(var key in form_data){
    for(var i = 0; i < headers.length; i++){
      if(headers[i] === key){
        // ヘッダーとkeyが一致した時に、そのヘッダーの列の新しい行（最後にデータが入ってる行の次の行）に
        // フォームの値を挿入します。
        sheet.getRange(last_row + 1, i + 1).setValue(form_data[key])
        break
      } else if(headers.length === i + 1){
        // ヘッダーとkeyが最後まで一致なかった時は、そのkeyを新しいヘッダーとして追加して、
        // そのヘッダーの列の新しい行にフォームの値を挿入します。
        var new_column = sheet.getLastColumn() + 1
        sheet.getRange(1, new_column).setValue(key)
        sheet.getRange(last_row + 1, new_column).setValue(form_data[key])
      }
    }
  }

  // フォーム以外のデータ挿入と個別処理 --------
  // 今回はタイムスタンプだけですが、例えば個別の「お問い合わせ番号」が要るとか、
  // セルの最後に「進捗状態」を入れる等用の処理です。
  headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
  for(var i = 0; i < headers.length; i++){
    switch(headers[i]){
      case 'タイムスタンプ':
        // 「タイムスタンプ」の場所に日時のデータを挿入。
        sheet.getRange(last_row + 1, i + 1).setValue(new Date())
        break
    }
  }
  
  // フォームのデータにメールアドレスが有ればメールを送信 --------
  if(e.parameter.メールアドレス){
    send_mail(e.parameter.メールアドレス, headers, form_data)
  }
  
  // JSONPを返す処理 --------
  // 今回は単純なデータしか返していませんが、頑張れば色々出来そうですねー。
  var return_json = JSON.stringify({work:'success'})
  return ContentService.createTextOutput(e.parameter.callback + '(' + return_json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT)
}

function send_mail(mail_address, headers, form_data){
  // HTMLメールとテキストメールのテンプレートを準備します。
  var html_mail = HtmlService.createTemplateFromFile('html_mail')
  html_mail.headers = headers
  html_mail.form_data = form_data

  var text_mail = HtmlService.createTemplateFromFile('text_mail')
  text_mail.headers = headers
  text_mail.form_data = form_data
  
  // メール送る際のオプションを設定します。
  var options = {}
  options.noReply = true
  // 「evaluate()」を行う事でテンプレート内のスクリプトを実行する事が出来ます。
  options.htmlBody = html_mail.evaluate().getContent()
  
  // テキストメールとオプションを設定してメールを送信。
  GmailApp.sendEmail(mail_address, '自動返信メール - 【GAS】 スプレッドシートと連携したAjaxフォーム', text_mail.evaluate().getContent(), options)
}