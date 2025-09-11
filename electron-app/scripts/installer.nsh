!macro customInstall
  ; $INSTDIR is the final installation folder
  DetailPrint "Running prepare.sh..."
  nsExec::ExecToLog '"$INSTDIR\\scripts\\bash.exe" "$INSTDIR\\scripts\\prepare.sh" "$INSTDIR"'
!macroend