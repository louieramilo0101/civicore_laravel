<?php
$b = App\Models\RegistryBirth::count();
echo "births total=$b\n";
echo "births archived=" . App\Models\RegistryBirth::where('status','archived')->count() . "\n";
echo "births archived with doc_id=" . App\Models\RegistryBirth::where('status','archived')->whereNotNull('document_id')->count() . "\n";
echo "births archived no doc_id=" . App\Models\RegistryBirth::where('status','archived')->whereNull('document_id')->count() . "\n";
echo "deaths total=" . App\Models\RegistryDeath::count() . "\n";
echo "deaths archived=" . App\Models\RegistryDeath::where('status','archived')->count() . "\n";
echo "marriages total=" . App\Models\RegistryMarriage::count() . "\n";
echo "marriages archived=" . App\Models\RegistryMarriage::where('status','archived')->count() . "\n";
echo "documents total=" . App\Models\Document::count() . "\n";
echo "documents soft deleted=" . App\Models\Document::onlyTrashed()->count() . "\n";