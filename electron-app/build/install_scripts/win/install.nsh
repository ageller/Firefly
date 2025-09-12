!macro customInstall
  ; Ensure details show up in the installer UI
  SetDetailsPrint both

  DetailPrint "Installing dependecies (this may take a while) ..."

  ; Call prepare script using powershell
  nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -NoProfile -File "$INSTDIR\resources\scripts\prepare.ps1" "$INSTDIR"'

  ; Capture exit code
  Pop $0

  ; fail installer if script fails
  StrCmp $0 0 +2
    Abort "prepare.ps1 script failed with exit code $0"
!macroend