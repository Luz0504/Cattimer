use std::io::{Read, Write};
use std::net::TcpListener;

#[tauri::command]
async fn start_auth_server(port: u16) -> Result<String, String> {
  let redirect_path = tauri::async_runtime::spawn_blocking(move || {
    let listener = TcpListener::bind(format!("127.0.0.1:{}", port))
      .map_err(|e| format!("No se pudo iniciar servidor en puerto {}: {}", port, e))?;

    let (mut stream, _addr) = listener
      .accept()
      .map_err(|e| format!("Error al aceptar conexión: {}", e))?;

    let mut buf = [0; 8192];
    let n = stream
      .read(&mut buf)
      .map_err(|e| format!("Error al leer solicitud: {}", e))?;

    let request = String::from_utf8_lossy(&buf[..n]);
    let path = request
      .lines()
      .next()
      .and_then(|line| line.split_whitespace().nth(1))
      .unwrap_or("/");

    let body = "<html><body style=\"display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#1a1a2e;color:white;\"><div style=\"text-align:center\"><h1>Autenticación completada</h1><p>Ya podés cerrar esta ventana y volver a Cattimer.</p></div></body></html>";
    let response = format!(
      "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\n\r\n{}",
      body.len(),
      body
    );
    stream
      .write_all(response.as_bytes())
      .map_err(|e| format!("Error al enviar respuesta: {}", e))?;

    Ok::<String, String>(path.to_string())
  })
  .await
  .map_err(|e| format!("Error interno: {}", e))?;

  redirect_path
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_store::Builder::default().build())
    .invoke_handler(tauri::generate_handler![start_auth_server])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
