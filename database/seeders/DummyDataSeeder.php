<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DummyDataSeeder extends Seeder
{
    public function run(): void
    {
        $barangays = [
            'Gomez-Zamora (Pob.)', 'Capt. C. Nazareno (Pob.)', 'Ibayo Silangan', 'Ibayo Estacion', 'Kanluran',
            'Makina', 'Sapa', 'Bucana Malaki', 'Bucana Sasahan', 'Bagong Karsada',
            'Balsahan', 'Bancaan', 'Muzon', 'Latoria', 'Labac',
            'Mabolo', 'San Roque', 'Santulan', 'Molino', 'Calubcob',
            'Halang', 'Malainen Bago', 'Malainen Luma', 'Palangue 1', 'Palangue 2 & 3',
            'Humbac', 'Munting Mapino', 'Sabang', 'Timalan Balsahan', 'Timalan Concepcion'
        ];

        $encoders = ['Admin Staff', 'Civil Registrar', 'Louie Dave Ramilo', 'Maria Santos', 'System Encoder'];

        // -------------------------------------------------------------
        // 1. 15 BIRTH CERTIFICATES
        // -------------------------------------------------------------
        $birthData = [
            ['name' => 'Mateo Luis Dela Cruz', 'barangay' => 'Ibayo Silangan', 'father' => 'Roberto Dela Cruz', 'mother' => 'Elena Santos'],
            ['name' => 'Sofia Rose Villanueva', 'barangay' => 'Gomez-Zamora (Pob.)', 'father' => 'Antonio Villanueva', 'mother' => 'Clara Reyes'],
            ['name' => 'Liam Alexander Rodriguez', 'barangay' => 'Bucana Malaki', 'father' => 'Carlos Rodriguez', 'mother' => 'Maria Gonzales'],
            ['name' => 'Chloe Isabelle Santos', 'barangay' => 'Capt. C. Nazareno (Pob.)', 'father' => 'Ramon Santos', 'mother' => 'Isabel Flores'],
            ['name' => 'Gabriel Ethan Ramos', 'barangay' => 'Balsahan', 'father' => 'Eduardo Ramos', 'mother' => 'Teresa Mercado'],
            ['name' => 'Mia Beatrice Fernandez', 'barangay' => 'Labac', 'father' => 'Fernando Fernandez', 'mother' => 'Beatriz Navarro'],
            ['name' => 'Noah Benjamin Reyes', 'barangay' => 'Muzon', 'father' => 'Benjamin Reyes', 'mother' => 'Grace Mendoza'],
            ['name' => 'Hannah Grace Mendoza', 'barangay' => 'San Roque', 'father' => 'Manuel Mendoza', 'mother' => 'Lourdes Bautista'],
            ['name' => 'Lucas Antonio Garcia', 'barangay' => 'Sabang', 'father' => 'Antonio Garcia', 'mother' => 'Sophia Alcantara'],
            ['name' => 'Ava Victoria Alcantara', 'barangay' => 'Timalan Concepcion', 'father' => 'Victor Alcantara', 'mother' => 'Victoria Torres'],
            ['name' => 'Daniel Joseph Mercado', 'barangay' => 'Mabolo', 'father' => 'Joseph Mercado', 'mother' => 'Christina Naval'],
            ['name' => 'Ella Camille Naval', 'barangay' => 'Palangue 1', 'father' => 'Francisco Naval', 'mother' => 'Camille Corpuz'],
            ['name' => 'Benjamin Cruz Aguinaldo', 'barangay' => 'Halang', 'father' => 'Emilio Aguinaldo', 'mother' => 'Rosa Cruz'],
            ['name' => 'Samantha Nicole Torres', 'barangay' => 'Bancaan', 'father' => 'Nicanor Torres', 'mother' => 'Sylvia Roxas'],
            ['name' => 'Oliver Francis Bautista', 'barangay' => 'Kanluran', 'father' => 'Francis Bautista', 'mother' => 'Olivia Salazar'],
        ];

        foreach ($birthData as $index => $item) {
            $dateObj = Carbon::now()->subDays(rand(10, 365));
            $formattedDate = $dateObj->format('Y-m-d');
            $certNo = 'BC-2026-' . str_pad($index + 101, 4, '0', STR_PAD_LEFT);
            $encoder = $encoders[array_rand($encoders)];

            $nameParts = explode(' ', $item['name']);
            $firstName = $nameParts[0];
            $lastName = end($nameParts);
            $middleName = count($nameParts) > 2 ? $nameParts[1] : 'Santos';

            $extractedFields = [
                'first_name' => $firstName,
                'middle_name' => $middleName,
                'last_name' => $lastName,
                'date_of_birth' => $formattedDate,
                'place_of_birth' => 'Naic Municipal Hospital, Naic, Cavite',
                'sex' => ($index % 2 == 0) ? 'Male' : 'Female',
                'father_name' => $item['father'],
                'mother_name' => $item['mother'],
                'barangay' => $item['barangay'],
                'registry_number' => $certNo,
                'province' => 'Cavite',
                'city_municipality' => 'Naic'
            ];

            $docId = DB::table('documents')->insertGetId([
                'name' => "Birth Cert - {$item['name']}.pdf",
                'type' => 'birth',
                'detected_type' => 'birth',
                'date' => $formattedDate,
                'size' => rand(1, 3) . '.' . rand(10, 99) . ' MB',
                'status' => 'processed',
                'personName' => $item['name'],
                'barangay' => $item['barangay'],
                'ocr_text' => "CERTIFICATE OF LIVE BIRTH\nName: {$item['name']}\nDate of Birth: {$formattedDate}\nPlace of Birth: Naic, Cavite\nFather: {$item['father']}\nMother: {$item['mother']}",
                'extracted_fields' => json_encode($extractedFields),
                'extracted_data' => json_encode($extractedFields),
                'encoded_by' => $encoder,
                'created_at' => $dateObj,
                'updated_at' => $dateObj,
            ]);

            DB::table('issuances')->insert([
                'document_id' => $docId,
                'certNumber' => $certNo,
                'type' => 'birth',
                'name' => $item['name'],
                'barangay' => $item['barangay'],
                'issuanceDate' => $formattedDate,
                'status' => 'Active',
                'encoded_by' => $encoder,
                'extracted_data' => json_encode($extractedFields),
                'created_at' => $dateObj,
                'updated_at' => $dateObj,
            ]);
        }

        // -------------------------------------------------------------
        // 2. 15 DEATH CERTIFICATES
        // -------------------------------------------------------------
        $deathData = [
            ['name' => 'Ernesto Ramon Gonzales', 'barangay' => 'Bucana Sasahan', 'cause' => 'Cardiopulmonary Arrest', 'age' => 74],
            ['name' => 'Teresa Maria Soriano', 'barangay' => 'Ibayo Estacion', 'cause' => 'Pneumonia', 'age' => 81],
            ['name' => 'Fernando Carlos Castillo', 'barangay' => 'Latoria', 'cause' => 'Cerebrovascular Accident', 'age' => 68],
            ['name' => 'Remedios Pilar Aquino', 'barangay' => 'Malainen Bago', 'cause' => 'Congestive Heart Failure', 'age' => 85],
            ['name' => 'Vicente Manuel De Leon', 'barangay' => 'Santulan', 'cause' => 'Renal Failure', 'age' => 72],
            ['name' => 'Josefina Carmen Morales', 'barangay' => 'Calubcob', 'cause' => 'Myocardial Infarction', 'age' => 79],
            ['name' => 'Gregorio Antonio Valenzuela', 'barangay' => 'Molino', 'cause' => 'Respiratory Failure', 'age' => 66],
            ['name' => 'Concepcion Rosa Pascual', 'barangay' => 'Munting Mapino', 'cause' => 'Sepsis', 'age' => 83],
            ['name' => 'Rodolfo Eduardo Salazar', 'barangay' => 'Sapa', 'cause' => 'Multiorgan Failure', 'age' => 70],
            ['name' => 'Esperanza Felisa Corpuz', 'barangay' => 'Bagong Karsada', 'cause' => 'Chronic Kidney Disease', 'age' => 77],
            ['name' => 'Arturo Domingo Roxas', 'barangay' => 'Timalan Balsahan', 'cause' => 'Acute Stroke', 'age' => 65],
            ['name' => 'Corazon Beatriz Guinto', 'barangay' => 'Palangue 2 & 3', 'cause' => 'Cardiogenic Shock', 'age' => 88],
            ['name' => 'Jaime Guillermo Legaspi', 'barangay' => 'Humbac', 'cause' => 'Hypertensive Cardiovascular Disease', 'age' => 71],
            ['name' => 'Natividad Consolacion Sison', 'barangay' => 'Malainen Luma', 'cause' => 'Severe Pneumonia', 'age' => 82],
            ['name' => 'Pacifico Teodoro Enriquez', 'barangay' => 'Makina', 'cause' => 'Cardiac Arrest', 'age' => 75],
        ];

        foreach ($deathData as $index => $item) {
            $dateObj = Carbon::now()->subDays(rand(10, 365));
            $formattedDate = $dateObj->format('Y-m-d');
            $certNo = 'DC-2026-' . str_pad($index + 101, 4, '0', STR_PAD_LEFT);
            $encoder = $encoders[array_rand($encoders)];

            $nameParts = explode(' ', $item['name']);
            $firstName = $nameParts[0];
            $lastName = end($nameParts);
            $middleName = count($nameParts) > 2 ? $nameParts[1] : 'Mendoza';

            $extractedFields = [
                'deceased_first_name' => $firstName,
                'deceased_middle_name' => $middleName,
                'deceased_last_name' => $lastName,
                'date_of_death' => $formattedDate,
                'place_of_death' => 'Naic Municipal Health Center, Naic, Cavite',
                'cause_of_death' => $item['cause'],
                'age' => $item['age'],
                'sex' => ($index % 2 == 0) ? 'Male' : 'Female',
                'barangay' => $item['barangay'],
                'registry_number' => $certNo,
                'province' => 'Cavite',
                'city_municipality' => 'Naic'
            ];

            $docId = DB::table('documents')->insertGetId([
                'name' => "Death Cert - {$item['name']}.pdf",
                'type' => 'death',
                'detected_type' => 'death',
                'date' => $formattedDate,
                'size' => rand(1, 3) . '.' . rand(10, 99) . ' MB',
                'status' => 'processed',
                'personName' => $item['name'],
                'barangay' => $item['barangay'],
                'ocr_text' => "CERTIFICATE OF DEATH\nDeceased: {$item['name']}\nDate of Death: {$formattedDate}\nCause of Death: {$item['cause']}\nPlace of Death: Naic, Cavite",
                'extracted_fields' => json_encode($extractedFields),
                'extracted_data' => json_encode($extractedFields),
                'encoded_by' => $encoder,
                'created_at' => $dateObj,
                'updated_at' => $dateObj,
            ]);

            DB::table('issuances')->insert([
                'document_id' => $docId,
                'certNumber' => $certNo,
                'type' => 'death',
                'name' => $item['name'],
                'barangay' => $item['barangay'],
                'issuanceDate' => $formattedDate,
                'status' => 'Active',
                'encoded_by' => $encoder,
                'extracted_data' => json_encode($extractedFields),
                'created_at' => $dateObj,
                'updated_at' => $dateObj,
            ]);
        }

        // -------------------------------------------------------------
        // 3. 15 MARRIAGE CERTIFICATES
        // -------------------------------------------------------------
        $marriageData = [
            ['husband' => 'Marco Paulo Reyes', 'wife' => 'Maria Angela Cruz', 'barangay' => 'Ibayo Silangan'],
            ['husband' => 'John David Lim', 'wife' => 'Katrina Patricia Tan', 'barangay' => 'Gomez-Zamora (Pob.)'],
            ['husband' => 'Raphael Vincent Ocampo', 'wife' => 'Bianca Isabel Dizon', 'barangay' => 'Capt. C. Nazareno (Pob.)'],
            ['husband' => 'Christian Joseph Rivera', 'wife' => 'Angelica Marie Santos', 'barangay' => 'Bucana Malaki'],
            ['husband' => 'Anthony Mark Castro', 'wife' => 'Janine Bernadette Flores', 'barangay' => 'Balsahan'],
            ['husband' => 'Paolo Andrew Sy', 'wife' => 'Christine Joy Hernandez', 'barangay' => 'Labac'],
            ['husband' => 'Kevin Raymund Tolentino', 'wife' => 'Patricia Anne Navarro', 'barangay' => 'Muzon'],
            ['husband' => 'Emmanuel James Perez', 'wife' => 'Kimberly Rose Dimaculangan', 'barangay' => 'San Roque'],
            ['husband' => 'Adrian Michael Evangelista', 'wife' => 'Joanna Marie Manalo', 'barangay' => 'Sabang'],
            ['husband' => 'Patrick Henry Cordero', 'wife' => 'Nicole Denise Austria', 'barangay' => 'Timalan Concepcion'],
            ['husband' => 'Jerome Francis Loyola', 'wife' => 'Stephanie Claire Miranda', 'barangay' => 'Mabolo'],
            ['husband' => 'Raymond Benedict Alcantara', 'wife' => 'Clarissa Jane Palma', 'barangay' => 'Palangue 1'],
            ['husband' => 'Dominic Alexander Villa', 'wife' => 'Jessica Michelle Guinto', 'barangay' => 'Halang'],
            ['husband' => 'Paolo Christian Roxas', 'wife' => 'Camille Victoria Santiago', 'barangay' => 'Bancaan'],
            ['husband' => 'Julian Edward De Guzman', 'wife' => 'Jacqueline Marie Abad', 'barangay' => 'Kanluran'],
        ];

        foreach ($marriageData as $index => $item) {
            $dateObj = Carbon::now()->subDays(rand(10, 365));
            $formattedDate = $dateObj->format('Y-m-d');
            $certNo = 'MC-2026-' . str_pad($index + 101, 4, '0', STR_PAD_LEFT);
            $encoder = $encoders[array_rand($encoders)];
            $coupleName = "{$item['husband']} & {$item['wife']}";

            $hParts = explode(' ', $item['husband']);
            $wParts = explode(' ', $item['wife']);

            $extractedFields = [
                'husband_first_name' => $hParts[0],
                'husband_middle_name' => count($hParts) > 2 ? $hParts[1] : 'Santos',
                'husband_last_name' => end($hParts),
                'wife_first_name' => $wParts[0],
                'wife_middle_name' => count($wParts) > 2 ? $wParts[1] : 'Reyes',
                'wife_last_name' => end($wParts),
                'date_of_marriage' => $formattedDate,
                'place_of_marriage' => 'Diocesan Shrine of Immaculate Conception, Naic, Cavite',
                'barangay' => $item['barangay'],
                'registry_number' => $certNo,
                'province' => 'Cavite',
                'city_municipality' => 'Naic'
            ];

            $docId = DB::table('documents')->insertGetId([
                'name' => "Marriage License - {$coupleName}.pdf",
                'type' => 'marriage',
                'detected_type' => 'marriage',
                'date' => $formattedDate,
                'size' => rand(1, 3) . '.' . rand(10, 99) . ' MB',
                'status' => 'processed',
                'personName' => $coupleName,
                'barangay' => $item['barangay'],
                'ocr_text' => "CERTIFICATE OF MARRIAGE\nHusband: {$item['husband']}\nWife: {$item['wife']}\nDate of Marriage: {$formattedDate}\nPlace of Marriage: Naic, Cavite",
                'extracted_fields' => json_encode($extractedFields),
                'extracted_data' => json_encode($extractedFields),
                'encoded_by' => $encoder,
                'created_at' => $dateObj,
                'updated_at' => $dateObj,
            ]);

            DB::table('issuances')->insert([
                'document_id' => $docId,
                'certNumber' => $certNo,
                'type' => 'marriage',
                'name' => $coupleName,
                'barangay' => $item['barangay'],
                'issuanceDate' => $formattedDate,
                'status' => 'Active',
                'encoded_by' => $encoder,
                'extracted_data' => json_encode($extractedFields),
                'created_at' => $dateObj,
                'updated_at' => $dateObj,
            ]);
        }
    }
}
