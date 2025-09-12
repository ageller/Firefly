!macro customInstall
  ; Ensure details show up in the installer UI
  SetDetailsPrint both

  DetailPrint ">>> Running prepare.ps1 script ..."

  ; Call prepare script using powershell
  nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -NoProfile -File "$INSTDIR\resources\scripts\prepare.ps1" "$INSTDIR"'

  ; Capture exit code
  Pop $0
  DetailPrint "prepare.ps1 exited with code $0"

  ; Optional: fail installer if script fails
  StrCmp $0 0 +2
    Abort "prepare.ps1 failed with exit code $0"
!macroend